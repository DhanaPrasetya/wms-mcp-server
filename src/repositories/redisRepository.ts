import redisClient from "../config/redis.js";
import { Service } from "typedi";

@Service() // Register the class with typedi for dependency injection
export default class RedisRepository {
	public async getRateLimitCount(
		key: string,
	): Promise<{ count: number; remainingTtlInSecond: number }> {
		let count: string | null = "0";
		let remainingTtlInSecond: number = 0;
		count = await redisClient.get(key);

		if (count) {
			remainingTtlInSecond = await redisClient.ttl(key);
		}

		return {
			count: parseInt(count || "0", 10),
			remainingTtlInSecond,
		};
	}

	public async get(key: string): Promise<string | null> {
		return await redisClient.get(key);
	}
}
