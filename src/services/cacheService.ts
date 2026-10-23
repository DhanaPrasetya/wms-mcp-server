import { Inject, Service } from "typedi";
import RedisRepository from "../repositories/redisRepository.js";

@Service()
export default class CacheService {
	@Inject(() => RedisRepository)
	private readonly rateLimitRepository!: RedisRepository;

	public async isPassUserIdRateLimit(
		userId: string,
	): Promise<{ isPass: boolean; remainingTtlInSecond: number }> {
		const maxAttemptPerMinute: number = 80;

		const accessObject: { count: number; remainingTtlInSecond: number } =
			await this.rateLimitRepository.getRateLimitCount(`rate-limit:${userId}`);

		if (accessObject.count > maxAttemptPerMinute) {
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
