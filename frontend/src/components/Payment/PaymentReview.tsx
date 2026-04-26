import React from "react";
import type { PaymentRequest } from "../../types/payment";

interface Props {
  request: PaymentRequest;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PaymentReview: React.FC<Props> = ({ request, onConfirm, onCancel }) => (
  <div>
    <h2>Review Payment</h2>
    <p>Asset: {request.asset}</p>
    <p>Amount: {request.amount}</p>
    {request.memo && <p>Memo: {request.memo}</p>}
    <p>From: {request.from}</p>
    <p>To: {request.to}</p>
    <button onClick={onConfirm}>Submit Payment</button>
    <button onClick={onCancel}>Cancel</button>
  </div>
);
