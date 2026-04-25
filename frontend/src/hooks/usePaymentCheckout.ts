import { useState, useCallback } from "react";
import { useWallet } from "./use-wallet";
import { signAndSubmitPayment } from "../utils/stellar/wallet";
import type { ParsedStellarPaymentURI } from "../utils/stellar/paymentUri";

export interface CheckoutState {
  status: "idle" | "processing" | "success" | "error";
  error: string | null;
}

export function usePaymentCheckout() {
  const {
    canTransact,
    connect,
    hasFreighter,
    horizonUrl,
    isConnected,
    isConnecting,
    isRefreshing,
    networkPassphrase,
    publicKey,
    refresh,
    requiredNetworkLabel,
    walletNetworkLabel,
    error: walletError,
    signTransaction,
  } = useWallet();

  const [status, setStatus] = useState<CheckoutState["status"]>("idle");
  const [error, setError] = useState<string | null>(null);

  const performPayment = useCallback(async (payment: ParsedStellarPaymentURI) => {
    if (!payment.amount) {
      throw new Error("Payment amount is required.");
    }

    if (!publicKey) {
      throw new Error("Connect your wallet before confirming this payment.");
    }

    if (!canTransact) {
      throw new Error(
        `Switch Freighter to ${requiredNetworkLabel} before paying.`,
      );
    }

    setStatus("processing");
    setError(null);

    try {
      const result = await signAndSubmitPayment({
        amount: payment.amount,
        destination: payment.destination,
        sourceAccount: publicKey,
        networkPassphrase,
        horizonUrl,
        memo: payment.memo,
        memoType: payment.memoType === "return" ? "text" : payment.memoType,
        signTransaction,
      });

      if (!result.success) {
        setStatus("error");
        const msg = result.error ?? "Could not submit payment.";
        setError(msg);
        return { success: false, error: msg };
      }

      setStatus("success");
      return { success: true };
    } catch (e: any) {
      const msg = e.message || "An unexpected error occurred.";
      setStatus("error");
      setError(msg);
      return { success: false, error: msg };
    }
  }, [canTransact, horizonUrl, networkPassphrase, publicKey, requiredNetworkLabel, signTransaction]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    // Wallet state
    canTransact,
    connect,
    hasFreighter,
    isConnected,
    isConnecting,
    isRefreshing,
    publicKey,
    refresh,
    requiredNetworkLabel,
    walletNetworkLabel,
    walletError,

    // Checkout state
    status,
    error,
    isProcessing: status === "processing",
    isSuccess: status === "success",
    isError: status === "error",

    // Actions
    performPayment,
    reset,
  };
}
