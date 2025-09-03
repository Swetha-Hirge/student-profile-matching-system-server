const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.connect().catch(console.error);

client.on('connect', () => {
  console.log('🔗 Redis connected');
});

module.exports = client;
