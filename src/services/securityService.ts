import { Inject, Service } from "typedi";
import JwtService from "./jwtService.js";
import RateLimitService from "./rateLimitService.js";
import type { RequestContext } from "../tools/context.js";

@Service()
export default class SecurityService {
	@Inject(() => JwtService)
	private readonly jwtService!: JwtService;

	@Inject(() => RateLimitService)
	private readonly rateLimitService!: RateLimitService;

	@Inject(() => SecurityService)
	private readonly security!: SecurityService;

	public async verifyToolRequest(
		request: RequestContext,
		allowedRolesArray: string[],
	): Promise<void> {
		const rateLimitCheck: { isPass: boolean; remainingTtlInSecond: number } =
			await this.rateLimitService.isPassApiValidRateLimit(
				// 30 attempts per minute
				request.clientIp,
				60,
				30,
			);

		if (!rateLimitCheck.isPass) {
			throw new Error(
				`Rate limit exceeded ! try again in ${rateLimitCheck.remainingTtlInSecond} seconds`,
			);
		}

		if (!allowedRolesArray.includes(request.user.role)) {
			throw new Error("Forbidden !");
		}
	}
}
