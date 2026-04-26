import { describe, expect, it, vi } from "vitest";
import { getSplitHistoryRepository } from "./splitHistoryRepository";
import { apiClient } from "../utils/api-client";

describe("splitHistoryRepository", () => {
  it("returns API data when backend is available", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: [
        {
          id: "x1",
          title: "API Split",
          totalAmount: 12,
          currency: "USD",
          date: "2026-01-01T00:00:00.000Z",
          status: "active",
          participants: [{ id: "1", name: "You" }],
          role: "creator",
        },
      ],
    });

    const result = await getSplitHistoryRepository().list();
    expect(result.source).toBe("api");
    expect(result.data[0]?.id).toBe("x1");
    getSpy.mockRestore();
  });

  it("falls back to fixture data when API fails", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("boom"));

    const result = await getSplitHistoryRepository().list();
    expect(result.source).toBe("fixture");
    expect(result.data.length).toBeGreaterThan(0);
    getSpy.mockRestore();
  });
});
