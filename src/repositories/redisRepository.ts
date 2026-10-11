import redisClient from "../config/redis.js";
import { Service } from "typedi";

@Service() // Register the class with typedi for dependency injection
export default class RedisRepository {
	public async initializeOrAddRateLimitCount(
		key: string,
		ttlInSeconds: number,
		maxLimit: number,
	): Promise<{ count: number; remainingTtlInSecond: number }> {
		const luaScript: string = `
      local ttl = tonumber(ARGV[1])
      local maxLimit = tonumber(ARGV[2])

      local current = tonumber(redis.call('GET', KEYS[1]))

      -- Key does not exist
      if not current then
        redis.call('SET', KEYS[1], 1, 'EX', ttl)
        return {1, ttl}
      end

      -- Ensure the key always has an expiration
      local remainingTtl = redis.call('TTL', KEYS[1])
      if remainingTtl == -1 then
        redis.call('EXPIRE', KEYS[1], ttl)
        remainingTtl = ttl
      end

      -- Don't increment beyond the configured limit
      if current > maxLimit then
        return {current, remainingTtl}
      end

      current = redis.call('INCR', KEYS[1])

      return {current, remainingTtl}
    `;

		const [count, remainingTtlInSecond]: [number, number] =
			(await redisClient.eval(luaScript, {
				keys: [key],
				arguments: [String(ttlInSeconds), String(maxLimit)],
			})) as [number, number];

		return {
			count,
			remainingTtlInSecond,
		};
	}
}
