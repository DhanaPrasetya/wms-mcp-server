import { Inject, Service } from "typedi";
import RedisRepository from "../repositories/redisRepository.js";

@Service()
export default class RateLimitService {
	@Inject(() => RedisRepository)
	private readonly rateLimitRepository!: RedisRepository;

	public async isPassApiValidRateLimit(
		ip: string,
		ttlInSeconds: number = 60,
		maxAttemptPerMinute: number = 30,
	): Promise<{ isPass: boolean; remainingTtlInSecond: number }> {
		const accessObject: { count: number; remainingTtlInSecond: number } =
			await this.rateLimitRepository.initializeOrAddRateLimitCount(
				ip,
				ttlInSeconds,
				maxAttemptPerMinute,
			);

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
}
