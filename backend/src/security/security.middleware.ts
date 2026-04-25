import { Injectable, NestMiddleware } from '@nestjs/common';
import type {
  NextFunction,
  Request,
  Response,
} from 'express-serve-static-core';
import helmet from 'helmet';
import xssClean from 'xss-clean';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly enableCsrf =
    process.env.SECURITY_CSRF?.toLowerCase() === 'true';

  private readonly helmetHandler = helmet({ contentSecurityPolicy: false });
  private readonly xssCleanHandler = xssClean();
  private readonly rateLimitHandler = rateLimit({ windowMs: 60 * 1000, max: 100 });
  private readonly csrfHandler = csrf({ cookie: true, ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] });

  use(req: Request, res: Response, next: NextFunction): void {
    this.helmetHandler(req, res, (helmetError?: unknown) => {
      if (helmetError) return next(helmetError as Error);

      this.xssCleanHandler(req, res, (xssError?: unknown) => {
        if (xssError) return next(xssError as Error);

        if (this.isProduction) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        this.rateLimitHandler(req, res, (rateLimitError?: unknown) => {
          if (rateLimitError) return next(rateLimitError as Error);
          if (this.enableCsrf) {
            this.csrfHandler(req, res, next);
          } else {
            next();
          }
        });
      });
    });
  }
}
