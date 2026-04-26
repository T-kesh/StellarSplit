import { useTranslation } from "react-i18next";
import { PaymentURIHandler } from "../components/Payment/PaymentURIHandler";
import { usePaymentCheckout } from "../hooks/usePaymentCheckout";
import type { ParsedStellarPaymentURI } from "../utils/stellar/paymentUri";

export default function PaymentURIPage() {
  const { t } = useTranslation();
  const {
    canTransact,
    connect,
    hasFreighter,
    isConnecting,
    isRefreshing,
    publicKey,
    refresh,
    requiredNetworkLabel,
    walletNetworkLabel,
    walletError,
    status,
    error,
    performPayment,
  } = usePaymentCheckout();

  const handlePay = async (payment: ParsedStellarPaymentURI) => {
    await performPayment(payment);
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {t("payment.pageTitle")}
      </h1>
      <p className="mb-4 text-sm text-gray-600">
        {t("payment.pageSubtitle")}
      </p>

      {!hasFreighter ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t("payment.freighterNotInstalled")}
        </div>
      ) : null}

      {hasFreighter && publicKey && !canTransact ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t("payment.networkHint", {
            wallet: walletNetworkLabel ?? "",
            required: requiredNetworkLabel ?? "",
          })}
        </div>
      ) : null}

      {walletError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {walletError}
        </div>
      ) : null}

      {!canTransact ? (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {!publicKey ? (
            <button
              type="button"
              onClick={() => void connect()}
              disabled={isConnecting || !hasFreighter}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnecting ? t("payment.connecting") : t("payment.connectFreighter")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? t("payment.refreshing") : t("payment.refreshWallet")}
          </button>
        </div>
      ) : null}

      <PaymentURIHandler onPay={handlePay} />

      {status === "success" ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {t("payment.success")}
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </main>
  );
}
