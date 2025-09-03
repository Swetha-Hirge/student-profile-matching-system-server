// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max: 100,                          // limit each IP to 100 requests per window
  message: { error: 'Too many requests, try again later.' }, // JSON instead of plain text
  standardHeaders: true,             // adds `RateLimit-*` headers
  legacyHeaders: false,              // disables `X-RateLimit-*`
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      error: 'Too many requests',
      retryAfterSeconds: Math.ceil(options.windowMs / 1000)
    });
  },
  keyGenerator: (req) => {
    // Default is req.ip; you can customise (e.g. userId if JWT exists)
    return req.ip;
  }
});

module.exports = limiter;
