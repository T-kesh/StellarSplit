import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/Home";
import RootLayout from "./layouts/RootLayout";
import RouteErrorBoundary from "./components/routing/RouteErrorBoundary";
import RoutePending from "./components/routing/RoutePending";
import { bootstrapTheme } from "./utils/themeBootstrap";
import "./i18n/config";
import App from "./App";

// Apply theme before hydration to prevent flash
bootstrapTheme();

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RoutePending />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "/dashboard",
        lazy: async () => {
          const { default: Dashboard } = await import("./pages/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "/split/:id",
        lazy: async () => {
          const { SplitDetailPage } = await import("./pages/SplitView/SplitDetailPage");
          return { Component: SplitDetailPage };
        },
      },
      {
        path: "/analytics",
        lazy: async () => {
          const { default: AnalyticsDashboard } = await import("./pages/AnalyticsDashboard");
          return { Component: AnalyticsDashboard };
        },
      },
      {
        path: "/split-groups",
        lazy: async () => {
          const { default: SplitGroup } = await import("./pages/SplitGroup");
          return { Component: SplitGroup };
        },
      },
      {
        path: "/history",
        lazy: async () => {
          const { default: SplitHistoryPage } = await import("./pages/SplitHistoryPage");
          return { Component: SplitHistoryPage };
        },
      },

      {
        path: "/pay",
        lazy: async () => {
          const { default: PaymentURIPage } = await import("./pages/PaymentURIPage");
          return { Component: PaymentURIPage };
        },
      },
      {
        path: "/create-split",
        lazy: async () => {
          const { SplitCreationWizard } = await import("./components/SplitWizard");
          return { Component: SplitCreationWizard };
        },
      },
      {
        path: "/notifications",
        lazy: async () => {
          const { default: NotificationCenterPage } = await import("./pages/NotificationCenterPage");
          return { Component: NotificationCenterPage };
        },
      },
      {
        path: "/drafts",
        lazy: async () => {
          const { default: DraftsPage } = await import("./pages/DraftsPage");
          return { Component: DraftsPage };
        },
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>,
);
