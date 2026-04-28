import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, CheckCircle } from 'lucide-react';
import type { Participant } from './SplitCalculator';

interface CalculationSummaryProps {
  participants: Participant[];
  subtotal: number;
  currency: string;
  rounding: 'none' | 'up' | 'down' | 'nearest';
  onExport?: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  XLM: 'XLM',
};

export function CalculationSummary({
  participants,
  subtotal,
  currency,
  rounding,
  onExport,
}: CalculationSummaryProps) {
  const { t } = useTranslation();
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';

  const roundedParticipants = useMemo(() => {
    if (rounding === 'none') return participants;

    return participants.map(p => ({
      ...p,
      amount: applyRounding(p.amount, rounding),
    }));
  }, [participants, rounding]);

  const applyRounding = (amount: number, method: string) => {
    switch (method) {
      case 'up':
        return Math.ceil(amount * 100) / 100;
      case 'down':
        return Math.floor(amount * 100) / 100;
      case 'nearest':
        return Math.round(amount * 100) / 100;
      default:
        return amount;
    }
  };

  const totalWithRounding = roundedParticipants.reduce((sum, p) => sum + p.amount, 0);
  const roundingDifference = totalWithRounding - subtotal;

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Receipt size={24} className="text-[var(--color-primary)]" aria-hidden="true" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('calculator.summary')}
        </h2>
      </div>

      {/* Summary Table */}
      <div className="overflow-x-auto">
        <table 
          className="w-full"
          role="table"
          aria-label={t('calculator.splitSummary')}
        >
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('calculator.participant')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('calculator.amount')}
              </th>
              {rounding !== 'none' && (
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('calculator.rounded')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {roundedParticipants.map((participant) => (
              <tr 
                key={participant.id} 
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-sm font-bold">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {participant.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  {currencySymbol}{participant.amount.toFixed(2)}
                </td>
                {rounding !== 'none' && (
                  <td className="py-3 px-4 text-right">
                    <span className="text-gray-500 dark:text-gray-400 line-through">
                      {currencySymbol}{participant.amount.toFixed(2)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                {t('calculator.total')}
              </td>
              <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                {currencySymbol}{subtotal.toFixed(2)}
              </td>
              {rounding !== 'none' && (
                <td className="py-3 px-4 text-right font-bold text-[var(--color-primary)]">
                  {currencySymbol}{totalWithRounding.toFixed(2)}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rounding Info */}
      {rounding !== 'none' && Math.abs(roundingDifference) > 0.01 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('calculator.roundingNote')}: {roundingDifference > 0 ? '+' : '-'}
            {currencySymbol}{Math.abs(roundingDifference).toFixed(2)}
          </p>
        </div>
      )}

      {/* Confirmation */}
      <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle size={20} aria-hidden="true" />
        <span className="text-sm font-medium">
          {t('calculator.calculationComplete')}
        </span>
      </div>

      {/* Export Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => {
            const text = roundedParticipants
              .map(p => `${p.name}: ${currencySymbol}${p.amount.toFixed(2)}`)
              .join('\n');
            navigator.clipboard.writeText(text);
          }}
          className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
        >
          {t('calculator.copyToClipboard')}
        </button>
        {onExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {t('calculator.export')}
          </button>
        )}
      </div>
    </div>
  );
}
