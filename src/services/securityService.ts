import { Service } from "typedi";
import JwtService from "./jwtService.js";
import RateLimitService from "./rateLimitService.js";
import type { RequestContext } from "../tools/context.js";
import type { userData } from "./jwtService.js";

@Service()
export default class SecurityService {
	constructor(
		protected jwtService: JwtService,
		protected rateLimitService: RateLimitService,
	) {}

	public async verifyToolRequest(
		request: RequestContext,
		allowedRolesArray: string[],
	): Promise<void> {
		const isPassRateLimit: { isPass: boolean; remainingTtlInSecond: number } =
			await this.rateLimitService.isPassApiValidRateLimit(
				request.clientIp,
				60,
				10,
			);

		if (!isPassRateLimit.isPass) {
			throw new Error(
				`Rate limit exceeded ! try again ${isPassRateLimit.remainingTtlInSecond} seconds`,
			);
		}

		const userData: userData = await this.jwtService.verifyAuthToken(request);

		if (!allowedRolesArray.includes(userData.role)) {
			throw new Error("Forbidden !");
		}
	}
}
