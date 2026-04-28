import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SplitCalculator } from '../components/SplitCalculator/SplitCalculator';
import { decodeCalculatorShare } from '../utils/calculatorShare';

export default function SplitCalculatorPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const encodedData = searchParams.get('data') ?? undefined;

  const initialState = useMemo(
    () => (encodedData ? decodeCalculatorShare(encodedData) : undefined),
    [encodedData],
  );

  const invalidShare = encodedData !== undefined && initialState === null;
  const invalidShareMessage = t('calculator.invalidShareLink');
  const invalidShareText =
    invalidShareMessage === 'calculator.invalidShareLink'
      ? 'Invalid calculator link. Showing default calculator state.'
      : invalidShareMessage;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {invalidShare && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-700 dark:bg-rose-950/20 dark:text-rose-100">
          {invalidShareText}
        </div>
      )}
      <SplitCalculator initialState={initialState ?? undefined} />
    </div>
  );
}
