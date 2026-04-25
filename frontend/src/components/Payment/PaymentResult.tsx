import React from "react";
import type { PaymentResult as PaymentResultData } from "../../types/payment";

interface Props {
  result: PaymentResultData;
  onRetry: () => void;
  onBackToSplit: (splitId?: string) => void;
}

export const PaymentResult: React.FC<Props> = ({ result, onRetry, onBackToSplit }) => {
  if (result.success) {
    return (
      <div>
        <h2>Payment Successful</h2>
        <p>Transaction Hash: {result.txHash}</p>
        <button onClick={() => onBackToSplit(result.txHash)}>Back to Split</button>
      </div>
    );
  }
  return (
    <div>
      <h2>Payment Failed</h2>
      <p>Error: {result.error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
};
