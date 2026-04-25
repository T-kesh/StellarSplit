import { useTranslation } from "react-i18next";
import { formatDate, formatCurrency } from "../../utils/format";
import type { HistorySplit } from "../../services/splitHistoryRepository";
import { SplitCard } from "./SplitCard";

interface SplitTimelineProps {
  splits: HistorySplit[];
}

export function SplitTimeline({ splits }: SplitTimelineProps) {
  // Group by month-year for headers
  const groups = splits.reduce<Record<string, HistorySplit[]>>((acc, s) => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  const orderedKeys = Object.keys(groups).sort((a, b) => (a > b ? -1 : 1));

  return (
    <div className="relative">
      <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-8">
        {orderedKeys.map((k) => (
          <div key={k}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-purple-600" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatMonthKey(k)}
              </h3>
            </div>
            <div className="space-y-4">
              {groups[k].map((s) => (
                <TimelineRow key={s.id} split={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ split }: { split: HistorySplit }) {
  const { t } = useTranslation();
  const participants = split.participants.map((p) =>
    p.name === "You" ? t("common.you") : p.name,
  );
  return (
    <div className="relative flex items-start gap-4">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
        </div>
      </div>
      <div className="flex-1">
        <SplitCard
          title={split.title}
          subtitle={formatDate(split.date)}
          amountLabel={formatCurrency(split.totalAmount, split.currency)}
          status={split.status}
          role={split.role}
          participants={participants}
        />
      </div>
    </div>
  );
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map((n) => Number(n));
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}