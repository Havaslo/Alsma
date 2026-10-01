import assert from "node:assert/strict";
import test from "node:test";

import { formatRussianPhone, isRussianPhoneComplete } from "./phone-format";

test("formats Russian numbers entered nationally or with a country code", () => {
  assert.equal(formatRussianPhone("9123456789"), "+7 (912) 345-67-89");
  assert.equal(formatRussianPhone("89123456789"), "+7 (912) 345-67-89");
  assert.equal(formatRussianPhone("+7 (912) 345-67-89"), "+7 (912) 345-67-89");
  assert.equal(formatRussianPhone("8"), "+7");
});

test("recognizes only a full Russian phone number", () => {
  assert.equal(isRussianPhoneComplete("+7 (912) 345-67-89"), true);
  assert.equal(isRussianPhoneComplete("+7 (912) 345-67"), false);
  assert.equal(isRussianPhoneComplete(""), false);
});
