import type { HistorySplit } from "../services/splitHistoryRepository";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/\"/g, '""')}"`;
  }
  return value;
}

export function buildHistoryCsv(rows: HistorySplit[]): string {
  const header = [
    "id",
    "title",
    "date",
    "status",
    "amount",
    "currency",
    "role",
    "participants",
  ];
  const csvRows = rows.map((s) =>
    [
      s.id,
      escapeCsv(s.title),
      new Date(s.date).toISOString(),
      s.status,
      s.totalAmount.toFixed(2),
      s.currency,
      s.role,
      escapeCsv(s.participants.map((p) => p.name).join("; ")),
    ].join(","),
  );
  return [header.join(","), ...csvRows].join("\n");
}

export function exportHistoryCsv(rows: HistorySplit[], filename = "split-history.csv") {
  const csv = buildHistoryCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
