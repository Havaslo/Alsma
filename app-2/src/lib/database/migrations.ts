import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Database } from "./database.js";

const DEFAULT_DATABASE_WAIT_ATTEMPTS = 60;
const DEFAULT_DATABASE_WAIT_DELAY_MILLISECONDS = 1_000;

export type DatabaseWaitOptions = {
  readonly attempts?: number;
  readonly delay?: (milliseconds: number) => Promise<void>;
  readonly delayMilliseconds?: number;
};

export type MigrationDeployer = () => Promise<void>;

const prismaPackageDirectory = dirname(
  fileURLToPath(import.meta.resolve("prisma/package.json")),
);
const prismaCliPath = resolve(prismaPackageDirectory, "build/index.js");

const wait = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const waitForDatabase = async (
  database: Pick<Database, "check">,
  options: DatabaseWaitOptions = {},
): Promise<void> => {
  const attempts = options.attempts ?? DEFAULT_DATABASE_WAIT_ATTEMPTS;
  const delay = options.delay ?? wait;
  const delayMilliseconds =
    options.delayMilliseconds ?? DEFAULT_DATABASE_WAIT_DELAY_MILLISECONDS;

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("Database wait attempts must be a positive integer.");
  }
  if (!Number.isFinite(delayMilliseconds) || delayMilliseconds < 0) {
    throw new RangeError("Database wait delay must be a non-negative number.");
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await database.check();
      return;
    } catch {
      if (attempt === attempts) {
        throw new Error(
          "Database did not become ready before migration startup.",
        );
      }
    }
    await delay(delayMilliseconds);
  }
};

export const deployPrismaMigrations: MigrationDeployer = async () => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCliPath, "migrate", "deploy"],
      {
        stdio: "inherit",
      },
    );
    child.once("error", () => {
      reject(new Error("Prisma migration process could not be started."));
    });
    child.once("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(new Error("Prisma migration deployment failed."));
    });
  });
};

export const runDatabaseMigrations = async (
  database: Pick<Database, "check">,
  waitOptions?: DatabaseWaitOptions,
  deploy: MigrationDeployer = deployPrismaMigrations,
): Promise<void> => {
  await waitForDatabase(database, waitOptions);
  await deploy();
};
