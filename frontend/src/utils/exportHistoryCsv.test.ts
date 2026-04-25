import { describe, expect, it } from "vitest";
import { buildHistoryCsv } from "./exportHistoryCsv";
import type { HistorySplit } from "../services/splitHistoryRepository";

describe("buildHistoryCsv", () => {
  it("escapes commas, quotes, and newlines", () => {
    const rows: HistorySplit[] = [
      {
        id: "s1",
        title: 'Dinner, "Late Night"\nSpecial',
        totalAmount: 45.5,
        currency: "USD",
        date: "2026-01-01T00:00:00.000Z",
        status: "completed",
        role: "creator",
        participants: [{ id: "1", name: "You" }, { id: "2", name: "Alex, Jr." }],
      },
    ];

    const csv = buildHistoryCsv(rows);
    expect(csv).toContain('"Dinner, ""Late Night""\nSpecial"');
    expect(csv).toContain('"You; Alex, Jr."');
  });
});
