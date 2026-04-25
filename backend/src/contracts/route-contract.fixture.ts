/**
 * Route contract fixtures for regression testing.
 *
 * Each manifest declares the canonical controller prefix and the routes that
 * MUST be registered under the global prefix (`api`) and URI versioning (`v1`).
 *
 * The integration spec uses these manifests to:
 *  1. Assert every expected route is present in the Swagger document.
 *  2. Assert no double-prefixed or missing-prefix routes exist.
 *  3. Make representative HTTP requests and validate status codes.
 */

import { AnalyticsController } from '../analytics/analytics.controller';
import { ReceiptsController } from '../receipts/receipts.controller';
import { ComplianceController } from '../compliance/compliance.controller';
import { ShortLinksController } from '../short-links/short-links.controller';
import { ReputationController } from '../reputation/reputation.controller';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteEntry {
  /** HTTP method */
  method: HttpMethod;
  /** Path relative to the controller prefix (e.g. "spending-trends") */
  path: string;
  /** Whether the route requires authentication */
  requiresAuth: boolean;
  /** Brief human-readable description for test output */
  description: string;
}

export interface ControllerRouteManifest {
  /** The NestJS controller class */
  controller: new (...args: any[]) => any;
  /** The @Controller() prefix declared on the class */
  prefix: string;
  /** Routes that must be registered for this controller */
  routes: RouteEntry[];
}

/* ------------------------------------------------------------------ */
/*  Analytics                                                          */
/* ------------------------------------------------------------------ */

export const analyticsManifest: ControllerRouteManifest = {
  controller: AnalyticsController,
  prefix: 'analytics',
  routes: [
    {
      method: 'get',
      path: 'spending-trends',
      requiresAuth: false,
      description: 'Get spending trends',
    },
    {
      method: 'get',
      path: 'category-breakdown',
      requiresAuth: false,
      description: 'Get category breakdown',
    },
    {
      method: 'get',
      path: 'top-partners',
      requiresAuth: false,
      description: 'Get top partners',
    },
    {
      method: 'get',
      path: 'monthly-report/:month',
      requiresAuth: false,
      description: 'Get monthly report',
    },
    {
      method: 'post',
      path: 'export',
      requiresAuth: false,
      description: 'Enqueue analytics export',
    },
    {
      method: 'get',
      path: 'reports/:id',
      requiresAuth: false,
      description: 'Get report status',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Receipts                                                           */
/* ------------------------------------------------------------------ */

export const receiptsManifest: ControllerRouteManifest = {
  controller: ReceiptsController,
  prefix: 'receipts',
  routes: [
    {
      method: 'post',
      path: 'split/:splitId/upload',
      requiresAuth: true,
      description: 'Upload receipt for a split',
    },
    {
      method: 'post',
      path: 'upload',
      requiresAuth: true,
      description: 'Upload standalone receipt',
    },
    {
      method: 'post',
      path: 'upload-standalone',
      requiresAuth: true,
      description: 'Upload standalone receipt (alias)',
    },
    {
      method: 'get',
      path: 'split/:splitId',
      requiresAuth: true,
      description: 'List receipts by split',
    },
    {
      method: 'get',
      path: ':receiptId/signed-url',
      requiresAuth: true,
      description: 'Get signed URL for receipt',
    },
    {
      method: 'delete',
      path: ':receiptId',
      requiresAuth: true,
      description: 'Soft-delete a receipt',
    },
    {
      method: 'get',
      path: ':receiptId/ocr-data',
      requiresAuth: true,
      description: 'Get OCR data for receipt',
    },
    {
      method: 'post',
      path: ':receiptId/reprocess-ocr',
      requiresAuth: true,
      description: 'Reprocess OCR for receipt',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Compliance                                                         */
/* ------------------------------------------------------------------ */

export const complianceManifest: ControllerRouteManifest = {
  controller: ComplianceController,
  prefix: 'compliance',
  routes: [
    {
      method: 'post',
      path: 'export/request',
      requiresAuth: true,
      description: 'Request compliance export',
    },
    {
      method: 'get',
      path: 'export/:requestId/status',
      requiresAuth: true,
      description: 'Get export status',
    },
    {
      method: 'get',
      path: 'categories',
      requiresAuth: true,
      description: 'Get expense categories',
    },
    {
      method: 'post',
      path: 'categories',
      requiresAuth: true,
      description: 'Create expense category',
    },
    {
      method: 'put',
      path: 'splits/:splitId/category',
      requiresAuth: true,
      description: 'Assign category to split',
    },
    {
      method: 'get',
      path: 'summary',
      requiresAuth: true,
      description: 'Get compliance summary',
    },
    {
      method: 'get',
      path: 'export/:requestId/download',
      requiresAuth: true,
      description: 'Download compliance export',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Short Links                                                        */
/* ------------------------------------------------------------------ */

export const shortLinksManifest: ControllerRouteManifest = {
  controller: ShortLinksController,
  prefix: 'short-links',
  routes: [
    {
      method: 'post',
      path: 'generate',
      requiresAuth: true,
      description: 'Generate short link',
    },
    {
      method: 'get',
      path: ':shortCode/resolve',
      requiresAuth: false,
      description: 'Resolve short link',
    },
    {
      method: 'get',
      path: ':shortCode/analytics',
      requiresAuth: true,
      description: 'Get short link analytics',
    },
    {
      method: 'post',
      path: 'nfc-payload/:splitId',
      requiresAuth: true,
      description: 'Generate NFC payload',
    },
    {
      method: 'delete',
      path: ':shortCode',
      requiresAuth: true,
      description: 'Delete short link',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Reputation                                                         */
/* ------------------------------------------------------------------ */

export const reputationManifest: ControllerRouteManifest = {
  controller: ReputationController,
  prefix: 'reputation',
  routes: [
    {
      method: 'get',
      path: ':walletAddress',
      requiresAuth: false,
      description: 'Get reputation by wallet',
    },
    {
      method: 'get',
      path: 'my-score',
      requiresAuth: false,
      description: 'Get own reputation score',
    },
    {
      method: 'get',
      path: ':walletAddress/history',
      requiresAuth: false,
      description: 'Get reputation history',
    },
    {
      method: 'get',
      path: 'leaderboard/trusted-payers',
      requiresAuth: false,
      description: 'Get trusted-payers leaderboard',
    },
    {
      method: 'get',
      path: 'badge/:walletAddress',
      requiresAuth: false,
      description: 'Get reputation badge',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Aggregate                                                          */
/* ------------------------------------------------------------------ */

export const ALL_MANIFESTS: ControllerRouteManifest[] = [
  analyticsManifest,
  receiptsManifest,
  complianceManifest,
  shortLinksManifest,
  reputationManifest,
];

/**
 * Build the set of canonical paths that MUST appear in the Swagger document
 * when the app uses the `api` global prefix and URI versioning (default v1).
 *
 * Format: `/api/v1/{prefix}/{path}` or `/api/{prefix}/{path}` depending on
 * whether versioning is enabled.
 */
export function buildCanonicalPaths(
  globalPrefix = 'api',
  versionPrefix = 'v1',
): string[] {
  const paths: string[] = [];

  for (const manifest of ALL_MANIFESTS) {
    for (const route of manifest.routes) {
      // Convert NestJS path params (:id) to Swagger/OpenAPI params ({id})
      const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
      paths.push(
        `/${globalPrefix}/${versionPrefix}/${manifest.prefix}/${openApiPath}`,
      );
    }
  }

  return paths.sort();
}

/**
 * Build canonical paths WITHOUT version prefix (for non-versioned test app).
 */
export function buildNonVersionedPaths(globalPrefix = 'api'): string[] {
  const paths: string[] = [];

  for (const manifest of ALL_MANIFESTS) {
    for (const route of manifest.routes) {
      const openApiPath = route.path.replace(/:(\w+)/g, '{$1}');
      paths.push(`/${globalPrefix}/${manifest.prefix}/${openApiPath}`);
    }
  }

  return paths.sort();
}
