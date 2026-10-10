import { Service } from "typedi";
import RedisRepository from "../repositories/redisRepository.js";

@Service()
export default class RateLimitService {
	constructor(protected rateLimitRepository: RedisRepository) {}

	public async isPassApiValidRateLimit(
		ip: string,
		ttlInSeconds: number,
		maxAttemptPerMinute: number,
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

	public async invalidAttemptRateLimit(
		userIp: string,
		ttlInSeconds: number,
	): Promise<boolean> {
		const existingKey: number =
			await this.rateLimitRepository.getKeyCount(userIp);
		if (!existingKey) {
			await this.rateLimitRepository.setKey(userIp, ttlInSeconds);
			return true;
		}
		await this.rateLimitRepository.incrementKey(userIp);

		return true;
	}

	public async isPassInvalidAttemptRateLimit(
		userIp: string,
		maxAttemptPerMinute: number,
	): Promise<boolean> {
		const currentCount: number =
			await this.rateLimitRepository.getKeyCount(userIp);
		if (currentCount >= maxAttemptPerMinute) {
			return false;
		}
		return true;
	}
}
