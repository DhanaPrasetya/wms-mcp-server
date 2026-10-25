import { Inject, Service } from "typedi";
import RedisRepository from "../repositories/redisRepository.js";
import { maxToolCallPerMinute } from "../enums/rules.js";

@Service()
export default class CacheService {
	@Inject(() => RedisRepository)
	private readonly rateLimitRepository!: RedisRepository;

	public async isPassUserIdRateLimit(
		userId: string,
	): Promise<{ isPass: boolean; remainingTtlInSecond: number }> {
		const accessObject: { count: number; remainingTtlInSecond: number } =
			await this.rateLimitRepository.getRateLimitCount(`rate-limit:${userId}`);

		if (accessObject.count >= maxToolCallPerMinute) {
			return {
				isPass: false,
				remainingTtlInSecond: accessObject.remainingTtlInSecond,
			};
		}

		return {
			isPass: true,
			remainingTtlInSecond: accessObject.remainingTtlInSecond,
		};
	}

	public async get(key: string): Promise<string | null> {
		return await this.rateLimitRepository.get(key);
	}
}
