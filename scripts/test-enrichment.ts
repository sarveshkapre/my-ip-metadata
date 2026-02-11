import assert from "node:assert/strict";
import { resolveEnrichmentProviders } from "../src/lib/enrichment";

function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    throw e;
  }
}

t("resolveEnrichmentProviders uses defaults when unset", () => {
  assert.deepEqual(resolveEnrichmentProviders(undefined), ["bgpview", "ipapi"]);
});

t("resolveEnrichmentProviders keeps configured order", () => {
  assert.deepEqual(resolveEnrichmentProviders("ipapi,bgpview"), ["ipapi", "bgpview"]);
});

t("resolveEnrichmentProviders trims spaces and deduplicates", () => {
  assert.deepEqual(resolveEnrichmentProviders(" ipapi , bgpview , ipapi "), ["ipapi", "bgpview"]);
});

t("resolveEnrichmentProviders ignores unknown providers", () => {
  assert.deepEqual(resolveEnrichmentProviders("unknown,ipapi"), ["ipapi"]);
});

t("resolveEnrichmentProviders falls back to defaults when all providers are invalid", () => {
  assert.deepEqual(resolveEnrichmentProviders("foo,bar"), ["bgpview", "ipapi"]);
});
