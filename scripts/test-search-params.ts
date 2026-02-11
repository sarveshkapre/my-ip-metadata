import assert from "node:assert/strict";
import { parseWhoAmIFlags, truthyParam } from "../src/lib/searchParams";

function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    throw e;
  }
}

t("truthyParam defaults to true when missing", () => {
  assert.equal(truthyParam(undefined), true);
});

t("truthyParam treats only string 0 as false", () => {
  assert.equal(truthyParam("0"), false);
  assert.equal(truthyParam("1"), true);
  assert.equal(truthyParam("false"), true);
});

t("truthyParam handles arrays by first value", () => {
  assert.equal(truthyParam(["0", "1"]), false);
  assert.equal(truthyParam(["1", "0"]), true);
});

t("parseWhoAmIFlags reads enrich/showHeaders values", () => {
  assert.deepEqual(parseWhoAmIFlags({ enrich: "0", showHeaders: "1" }), {
    enrich: false,
    showHeaders: true,
  });
});

t("parseWhoAmIFlags defaults both toggles to true", () => {
  assert.deepEqual(parseWhoAmIFlags(undefined), {
    enrich: true,
    showHeaders: true,
  });
});
