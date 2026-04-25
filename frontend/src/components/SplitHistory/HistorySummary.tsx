import { useTranslation } from "react-i18next";

interface HistorySummaryProps {
  total: number;
  totalAmountLabel: string;
  active: number;
  completed: number;
  cancelled: number;
  averageLabel: string;
}

export function HistorySummary({ total, totalAmountLabel, active, completed, cancelled, averageLabel }: HistorySummaryProps) {
  const { t } = useTranslation();
  return (
    <aside className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">{t("history.summaryTitle")}</h3>
      <ul className="space-y-3">
        <li className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t("history.totalSplits")}</span>
          <span className="text-sm font-semibold">{total}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t("history.totalAmount")}</span>
          <span className="text-sm font-semibold">{totalAmountLabel}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t("history.avgPerSplit")}</span>
          <span className="text-sm font-semibold">{averageLabel}</span>
        </li>
      </ul>
      <div className="mt-6">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("history.byStatus")}</p>
        <div className="flex gap-2">
          <Badge label={t("history.badgeActive")} value={active} colorClass="bg-blue-50 text-blue-700 border-blue-200" />
          <Badge label={t("history.badgeCompleted")} value={completed} colorClass="bg-green-50 text-green-700 border-green-200" />
          <Badge label={t("history.badgeCancelled")} value={cancelled} colorClass="bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
        </div>
      </div>
    </aside>
  );
}

function Badge({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${colorClass}`}>
      {label}: {value}
    </span>
  );
}