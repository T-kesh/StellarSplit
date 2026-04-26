import { describe, expect, it } from "vitest";
import i18n from "./config";

/**
 * Smoke test: dashboard, split history, payment URI, and payment modal keys
 * resolve in the default locale and a secondary locale (no raw key fallthrough).
 */
const CASES: Array<{
  key: string;
  options?: Record<string, string | number>;
}> = [
  { key: "common.close" },
  { key: "common.you" },
  { key: "dashboard.title" },
  { key: "dashboard.ariaLabel" },
  { key: "dashboard.signedInName", options: { name: "Test" } },
  { key: "dashboard.connectToLoad" },
  { key: "dashboard.connectToContinue" },
  { key: "dashboard.recentActivity" },
  { key: "dashboard.viewHistory" },
  { key: "dashboard.activity.createdWithTitle", options: { title: "Dinner" } },
  { key: "dashboard.stats.youOwe" },
  { key: "history.title" },
  { key: "history.showing", options: { count: 1, total: 3 } },
  { key: "history.statusActive" },
  { key: "history.roleCreator" },
  { key: "history.sortDateDesc" },
  { key: "payment.pageTitle" },
  { key: "payment.pageSubtitle" },
  { key: "payment.networkHint", options: { wallet: "pubnet", required: "testnet" } },
  { key: "split.confirmPayment" },
  { key: "split.freighterWallet" },
  { key: "split.expectedNetwork", options: { network: "Test" } },
  { key: "split.paymentMemo", options: { splitId: "abc" } },
  { key: "split.networkSwitchSignModal", options: { wallet: "A", required: "B" } },
  { key: "split.scanQrToPay" },
  { key: "split.resolveWalletToContinue" },
];

function expectKeysResolve(lng: "en" | "fr") {
  for (const { key, options } of CASES) {
    const result = i18n.t(key, { ...options, lng });
    expect(result, `${lng} ${key}`).not.toBe(key);
    expect(String(result).trim().length, `${lng} ${key}`).toBeGreaterThan(0);
  }
}

describe("i18n surface keys (dashboard, history, payment, split)", () => {
  it("resolves keys in the default locale (en)", () => {
    expectKeysResolve("en");
  });

  it("resolves keys in a secondary locale (fr)", () => {
    expectKeysResolve("fr");
  });
});
