const { Redis } = require('@upstash/redis');

let _redis = null;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  return _redis;
}

async function getCache(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    return null;
  }
}

async function setCache(key, value, ttlSeconds = 30) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error('Cache set error FULL:', err);
  }
}

async function deleteCache(key) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    return;
  }
}

module.exports = { getCache, setCache, deleteCache };
