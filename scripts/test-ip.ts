import assert from "node:assert/strict";
import { isLikelyPublicIp, ipVersion, normalizeIp, parseForwardedForChain } from "../src/lib/ip";

function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    throw e;
  }
}

t("normalizeIp trims and parses ipv4", () => {
  assert.equal(normalizeIp("  1.2.3.4  "), "1.2.3.4");
});

t("normalizeIp takes first item from x-forwarded-for-like chain", () => {
  assert.equal(normalizeIp(" 1.2.3.4, 5.6.7.8 "), "1.2.3.4");
});

t("normalizeIp strips ipv4 port", () => {
  assert.equal(normalizeIp("1.2.3.4:1234"), "1.2.3.4");
});

t("normalizeIp strips ipv6 brackets and zone id", () => {
  assert.equal(normalizeIp("[fe80::1%en0]:443"), "fe80::1");
});

t("normalizeIp rejects non-ips", () => {
  assert.equal(normalizeIp("nope"), null);
  assert.equal(normalizeIp("999.2.3.4"), null);
});

t("parseForwardedForChain returns only valid ips", () => {
  assert.deepEqual(parseForwardedForChain("1.1.1.1, nope, 2.2.2.2:55"), ["1.1.1.1", "2.2.2.2"]);
});

t("ipVersion detects v4/v6/unknown", () => {
  assert.equal(ipVersion("1.2.3.4"), "ipv4");
  assert.equal(ipVersion("2001:db8::1"), "ipv6");
  assert.equal(ipVersion("nope"), "unknown");
});

t("isLikelyPublicIp handles common non-public ipv4 ranges", () => {
  assert.equal(isLikelyPublicIp("127.0.0.1"), false);
  assert.equal(isLikelyPublicIp("10.1.2.3"), false);
  assert.equal(isLikelyPublicIp("192.168.1.1"), false);
  assert.equal(isLikelyPublicIp("172.16.0.1"), false);
  assert.equal(isLikelyPublicIp("100.64.0.1"), false);
  assert.equal(isLikelyPublicIp("169.254.10.10"), false);
});

t("isLikelyPublicIp handles common non-public ipv6 ranges", () => {
  assert.equal(isLikelyPublicIp("::1"), false);
  assert.equal(isLikelyPublicIp("fe80::1"), false);
  assert.equal(isLikelyPublicIp("fc00::1"), false);
});

t("isLikelyPublicIp treats typical public addresses as public", () => {
  assert.equal(isLikelyPublicIp("1.1.1.1"), true);
  assert.equal(isLikelyPublicIp("2606:4700:4700::1111"), true);
});
