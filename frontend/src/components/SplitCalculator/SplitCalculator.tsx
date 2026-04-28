import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Download, Share2, Save, RefreshCw } from "lucide-react";
import { EqualSplitCalc } from "./EqualSplitCalc";
import { ItemizedSplitCalc } from "./ItemizedSplitCalc";
import { PercentageSplitCalc } from "./PercentageSplitCalc";
import { CustomSplitCalc } from "./CustomSplitCalc";
import { CalculationSummary } from "./CalculationSummary";
import {
  CalculatorTemplate,
  DuplicateTemplateNameError,
  deleteCalculatorTemplate,
  getCalculatorTemplate,
  listCalculatorTemplates,
  saveCalculatorTemplate,
} from "../../services/calculatorTemplateStore";
import { exportSplitCalculation } from "../../utils/exportSplitCalculation";

export type CalculatorType = "equal" | "itemized" | "percentage" | "custom";

export interface Participant {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  items: string[];
}

export interface SplitItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
}

export interface CalculatorState {
  type: CalculatorType;
  participants: Participant[];
  items: SplitItem[];
  totalAmount: number;
  taxAmount: number;
  tipAmount: number;
  currency: string;
  rounding: "none" | "up" | "down" | "nearest";
}

const INITIAL_STATE: CalculatorState = {
  type: "equal",
  participants: [
    { id: "1", name: "Person 1", amount: 0, percentage: 0, items: [] },
    { id: "2", name: "Person 2", amount: 0, percentage: 0, items: [] },
  ],
  items: [],
  totalAmount: 0,
  taxAmount: 0,
  tipAmount: 0,
  currency: "USD",
  rounding: "none",
};

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "XLM", symbol: "XLM", name: "Stellar Lumens" },
];

export function SplitCalculator() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CalculatorType>("equal");
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);
  const [savedTemplates, setSavedTemplates] = useState<CalculatorTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    setSavedTemplates(listCalculatorTemplates());
  }, []);

  const updateState = useCallback((updates: Partial<CalculatorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const calculateSubtotal = () => {
    return state.totalAmount + state.taxAmount + state.tipAmount;
  };

  const handleExport = () => {
    exportSplitCalculation(
      {
        type: state.type,
        participants: state.participants,
        items: state.items,
        subtotal: calculateSubtotal(),
        currency: state.currency,
        rounding: state.rounding,
      },
      `split-calculation-${Date.now()}.json`,
    );
  };

  const handleSaveTemplate = () => {
    setIsSavingTemplate((current) => !current);
    setTemplateError(null);
  };

  const handleTemplateSaveSubmit = () => {
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      setTemplateError(t('calculator.templateNameRequired') || 'Enter a template name.');
      return;
    }

    try {
      const saved = saveCalculatorTemplate(normalizedName, state);
      setSavedTemplates((prev) => [...prev, saved]);
      setTemplateName('');
      setTemplateError(null);
      setIsSavingTemplate(false);
    } catch (error) {
      if (error instanceof DuplicateTemplateNameError) {
        setTemplateError(t('calculator.templateDuplicateName') || 'A template with this name already exists.');
      } else {
        setTemplateError(t('calculator.saveTemplateError') || 'Unable to save template.');
      }
    }
  };

  const handleApplyTemplate = (name: string) => {
    const template = getCalculatorTemplate(name);
    if (!template) {
      return;
    }

    setState({ ...template.state });
    setActiveTab(template.state.type);
  };

  const handleDeleteTemplate = (name: string) => {
    deleteCalculatorTemplate(name);
    setSavedTemplates((prev) => prev.filter((item) => item.name !== name));
  };

  const handleShare = async () => {
    const summary = {
      type: state.type,
      participants: state.participants,
      items: state.items,
      subtotal: calculateSubtotal(),
      currency: state.currency,
    };

    const encoded = btoa(JSON.stringify(summary));
    const shareUrl = `${window.location.origin}/calculator?data=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("calculator.shareTitle"),
          text: t("calculator.shareText"),
          url: shareUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
  };

  const renderCalculator = () => {
    switch (activeTab) {
      case "equal":
        return (
          <EqualSplitCalc
            participants={state.participants}
            totalAmount={state.totalAmount}
            taxAmount={state.taxAmount}
            tipAmount={state.tipAmount}
            currency={state.currency}
            onParticipantsChange={(participants) =>
              updateState({ participants })
            }
            onTotalChange={(totalAmount) => updateState({ totalAmount })}
            onTaxChange={(taxAmount) => updateState({ taxAmount })}
            onTipChange={(tipAmount) => updateState({ tipAmount })}
          />
        );
      case "itemized":
        return (
          <ItemizedSplitCalc
            participants={state.participants}
            items={state.items}
            taxAmount={state.taxAmount}
            tipAmount={state.tipAmount}
            currency={state.currency}
            onParticipantsChange={(participants) =>
              updateState({ participants })
            }
            onItemsChange={(items) => updateState({ items })}
            onTaxChange={(taxAmount) => updateState({ taxAmount })}
            onTipChange={(tipAmount) => updateState({ tipAmount })}
          />
        );
      case "percentage":
        return (
          <PercentageSplitCalc
            participants={state.participants}
            totalAmount={state.totalAmount}
            taxAmount={state.taxAmount}
            tipAmount={state.tipAmount}
            currency={state.currency}
            onParticipantsChange={(participants) =>
              updateState({ participants })
            }
            onTotalChange={(totalAmount) => updateState({ totalAmount })}
            onTaxChange={(taxAmount) => updateState({ taxAmount })}
            onTipChange={(tipAmount) => updateState({ tipAmount })}
          />
        );
      case "custom":
        return (
          <CustomSplitCalc
            participants={state.participants}
            totalAmount={state.totalAmount}
            currency={state.currency}
            onParticipantsChange={(participants) =>
              updateState({ participants })
            }
            onTotalChange={(totalAmount) => updateState({ totalAmount })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--color-primary)] rounded-xl">
            <Calculator className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("calculator.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("calculator.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t("calculator.reset")}
            title={t("calculator.reset")}
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleSaveTemplate}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t("calculator.saveTemplate")}
            title={t("calculator.saveTemplate")}
          >
            <Save size={20} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t("calculator.export")}
            title={t("calculator.export")}
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t("calculator.share")}
            title={t("calculator.share")}
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <label
            htmlFor="currency-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("calculator.currency")}:
          </label>
          <select
            id="currency-select"
            value={state.currency}
            onChange={(e) => updateState({ currency: e.target.value })}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="rounding-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("calculator.rounding")}:
          </label>
          <select
            id="rounding-select"
            value={state.rounding}
            onChange={(e) =>
              updateState({
                rounding: e.target.value as CalculatorState["rounding"],
              })
            }
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="none">{t("calculator.roundingNone")}</option>
            <option value="up">{t("calculator.roundingUp")}</option>
            <option value="down">{t("calculator.roundingDown")}</option>
            <option value="nearest">{t("calculator.roundingNearest")}</option>
          </select>
        </div>
      </div>

      {/* Saved Templates */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('calculator.savedTemplates') || 'Saved Templates'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('calculator.savedTemplatesSubtitle') || 'Capture your split configurations for reuse.'}
            </p>
          </div>
          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            type="button"
          >
            {t('calculator.saveTemplate') || 'Save Template'}
          </button>
        </div>

        {isSavingTemplate && (
          <div className="mb-4 grid gap-3">
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder={t('calculator.templateNamePlaceholder') || 'Template name'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              aria-label={t('calculator.templateNamePlaceholder') || 'Template name'}
            />
            {templateError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{templateError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTemplateSaveSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                type="button"
              >
                {t('calculator.save') || 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsSavingTemplate(false);
                  setTemplateName('');
                  setTemplateError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                type="button"
              >
                {t('calculator.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {savedTemplates.length > 0 ? (
          <div className="grid gap-3">
            {savedTemplates.map((template) => (
              <div
                key={template.name}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{template.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('calculator.lastUpdated') || 'Last updated'}:{' '}
                      {new Date(template.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(template.name)}
                      className="px-3 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
                    >
                      {t('calculator.apply') || 'Apply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.name)}
                      className="px-3 py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-900 transition-colors"
                    >
                      {t('calculator.delete') || 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('calculator.noSavedTemplates') || 'No templates saved yet.'}
          </p>
        )}
      </div>

      {/* Calculator Tabs */}
      <div
        className="mb-6"
        role="tablist"
        aria-label={t("calculator.calculatorType")}
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "equal", label: t("calculator.equal") },
              { key: "itemized", label: t("calculator.itemized") },
              { key: "percentage", label: t("calculator.percentage") },
              { key: "custom", label: t("calculator.custom") },
            ] as { key: CalculatorType; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                activeTab === tab.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calculator Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        {renderCalculator()}
      </div>

      {/* Summary */}
      <CalculationSummary
        participants={state.participants}
        subtotal={calculateSubtotal()}
        currency={state.currency}
        rounding={state.rounding}
        onExport={handleExport}
      />
    </div>
  );
}
