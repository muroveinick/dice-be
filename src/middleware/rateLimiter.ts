import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * Basic rate limiting middleware.
 * Limits each IP to `max` requests per `windowMs` timeframe.
 * Adjust the values according to your application's needs.
 */
export const rateLimiter = rateLimit({
  // 1-minute window
  windowMs: 1 * 60 * 1000,
  // Limit each IP to 30 requests per windowMs
  max: 30,
  // Return rate limit info in the `RateLimit-*` headers
  standardHeaders: true,
  // Disable the deprecated `X-RateLimit-*` headers
  legacyHeaders: false,
});

export const socketLimiter = new RateLimiterMemory({
  points: 10, // allowed events
  duration: 10, // per 10-second window
});
