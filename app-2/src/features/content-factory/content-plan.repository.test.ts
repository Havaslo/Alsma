import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { createContentPlanRepository } from "./content-plan.repository.js";

const createApprovalDatabase = (initialStatus: string) => {
  const post = {
    id: "plan-post",
    status: initialStatus,
    approvedAt: null as Date | null,
    approvedById: null as string | null,
  };
  const client = {
    contentPlanPost: {
      updateMany: async (input: {
        where: { id: string; status: string };
        data: Record<string, unknown>;
      }) => {
        if (input.where.id !== post.id || input.where.status !== post.status) {
          return { count: 0 };
        }
        Object.assign(post, input.data);
        return { count: 1 };
      },
      findUnique: async () => ({ ...post }),
    },
  };
  return {
    database: { client } as unknown as Database,
    post,
  };
};

test("only a post waiting for review can be approved, and approval is recorded", async () => {
  const { database, post } = createApprovalDatabase("needs_review");
  const repository = createContentPlanRepository(database);

  const approved = await repository.approvePost("plan-post", "admin-1");
  assert.equal(approved?.status, "approved");
  assert.equal(post.status, "approved");
  assert.equal(post.approvedById, "admin-1");
  assert.ok(post.approvedAt instanceof Date);

  const duplicateApproval = await repository.approvePost(
    "plan-post",
    "admin-2",
  );
  assert.equal(duplicateApproval, null);
  assert.equal(post.approvedById, "admin-1");
});

test("a generation error cannot be approved", async () => {
  const { database } = createApprovalDatabase("generation_failed");
  const repository = createContentPlanRepository(database);

  const approved = await repository.approvePost("plan-post", "admin-1");
  assert.equal(approved, null);
});
