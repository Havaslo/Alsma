import assert from "node:assert/strict";
import { test } from "node:test";

import {
  contentFactoryTextGenerationQuerySchema,
  contentFactoryTextRefinementBodySchema,
} from "./content-factory.schemas.js";

test("accepts channel refinement requests with source tags as an array", () => {
  const input = {
    action: "regenerate",
    currentText: "Исходный текст",
    prompt: "Пост об отдыхе",
    referencePhotoBase64: "aGVsbG8=",
    selectedChannels: ["telegram"],
    sourceTitle: "Бассейн",
    sourceCategory: "Отдых",
    sourceTags: ["вода", "релакс"],
  };

  assert.deepEqual(
    contentFactoryTextRefinementBodySchema.parse(input).sourceTags,
    input.sourceTags,
  );
});

test("continues parsing source tags from text-generation query parameters", () => {
  const input = {
    prompt: "Пост об отдыхе",
    selectedChannels: "telegram",
    sourceTitle: "Бассейн",
    sourceCategory: "Отдых",
    sourceTags: "вода|релакс",
  };

  assert.deepEqual(
    contentFactoryTextGenerationQuerySchema.parse(input).sourceTags,
    ["вода", "релакс"],
  );
});
