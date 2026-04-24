# Data Provenance and Mock Status

This document tracks the current state of data integration across the StellarSplit frontend. It helps contributors distinguish between fully integrated production paths and simulation/mock-backed features.

## Data Integration Matrix

| Feature | Screen/Component | Status | Backend Service | Notes |
|---------|------------------|--------|-----------------|-------|
| **Splits** | Dashboard, Split Detail | ✅ Live | `SplitsModule` | Fully integrated. |
| **History** | User Profile History | ✅ Live | `SplitHistoryModule` | Fully integrated. |
| **OCR** | Receipt Scanning | ⚠️ Hybrid | `ReceiptsModule` | Live OCR extraction, but fallback to mocks if processing fails. |
| **Analytics** | Spending Trends, Category | ⚠️ Hybrid | `AnalyticsModule` | Spending and Categories are live. Debt balances and Heatmaps are currently mocks. |
| **Groups** | Group Management | ✅ Live | `GroupModule` | Fully integrated. |
| **Settlement** | Suggestions | 🧪 Mock | `SettlementModule` | Currently uses deterministic mocks for demo purposes. |

---

## Provenance Notes

### 📊 Analytics
- **Live Path**: Fetches data from `/api/analytics/spending-trends`, `/api/analytics/category-breakdown`, and `/api/analytics/top-partners`.
- **Mock Fallback**: If the backend is unreachable or returns an error, the `analyticsDataProvider` falls back to a full set of `MOCK_*` fixtures defined in `frontend/src/services/analyticsDataProvider.ts`.
- **Hardcoded Mocks**: Even in "live" mode, `debtBalances`, `heatmapData`, and `timeDistribution` are currently fulfilled by `Promise.resolve(MOCK_*)`.

### 🧾 OCR and Receipts
- **Processing**: The scanning logic is live and performed by the backend.
- **Simulation**: In development environments without a functional Tesseract.js worker, the frontend may simulate successful parsing for UI testing.

### 👥 Groups and Friends
- **Live Path**: Integrated with `GroupModule` and `FriendshipModule`.
- **Fixtures**: Some complex graph visualizations may use generated fixtures if the user has a small social graph.

---

## Production Expectations

For a "production-ready" status, the following must be addressed:
1. Replace `Promise.resolve(MOCK_*)` in `analyticsDataProvider.ts` with real API calls.
2. Integrate `SettlementModule` with live blockchain data for debt simplification suggestions.
3. Remove all mock-fallback logic from `NODE_ENV=production` builds.

> [!IMPORTANT]
> When testing new features, ensure you are not accidentally looking at mock data. Use the "Source Indicator" (if available in your dev tools) to verify data provenance.
