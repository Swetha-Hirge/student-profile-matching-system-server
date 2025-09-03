// middleware/cacheMiddleware.js
const redisClient = require('../config/redis');

exports.cacheMiddleware = (keyPrefix, ttlSeconds = 60) => async (req, res, next) => {
  try {
    // Build key safely
    const key = [
      keyPrefix,
      req.originalUrl // full path + querystring = unique
    ].join(':');

    // Check cache
    const cached = await redisClient.get(key);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Monkey-patch res.json
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only cache if success (200–299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await redisClient.setEx(key, ttlSeconds, JSON.stringify(body));
        } catch (e) {
          console.error('Redis setEx error:', e.message);
        }
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('Redis middleware error:', err.message);
    next(); // fallback to next handler
  }
};
