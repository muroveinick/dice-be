import rateLimit from "express-rate-limit";

/**
 * Basic rate limiting middleware.
 * Limits each IP to `max` requests per `windowMs` timeframe.
 * Adjust the values according to your application's needs.
 */
export const rateLimiter = rateLimit({
  // 15-minute window
  windowMs: 15 * 60 * 1000,
  // Limit each IP to 100 requests per windowMs
  max: 100,
  // Return rate limit info in the `RateLimit-*` headers
  standardHeaders: true,
  // Disable the deprecated `X-RateLimit-*` headers
  legacyHeaders: false,
});
