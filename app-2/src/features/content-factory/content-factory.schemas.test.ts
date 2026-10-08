import assert from "node:assert/strict";
import { test } from "node:test";

import {
  contentFactoryTextGenerationBodySchema,
  contentFactoryTextGenerationQuerySchema,
  contentFactoryTextRefinementBodySchema,
} from "./content-factory.schemas.js";

test("accepts text generation without selecting a reference image", () => {
  const input = {
    prompt: "Публикация о спокойном отдыхе",
    selectedChannels: ["vk", "telegram"],
    brief: {
      postType: "Полезный",
      format: "Пост",
      audience: "Семьи",
      keyFacts: "Не добавлять неподтверждённые цены",
      callToAction: "Выбрать даты на сайте",
      styleGuidance: "Спокойный тон",
      imagePrompt: "Утренний свет",
      sourceImageRecommendation: "Фото бассейна",
    },
  };

  assert.deepEqual(contentFactoryTextGenerationBodySchema.parse(input), input);
});

test("accepts text refinement without a reference image", () => {
  const input = {
    action: "shorter",
    currentText: "Пост для сокращения",
    prompt: "Пост об отдыхе",
    selectedChannels: ["telegram"],
  };

  assert.deepEqual(contentFactoryTextRefinementBodySchema.parse(input), input);
});

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
