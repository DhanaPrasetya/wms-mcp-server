import { Inject, Service } from "typedi";
import RateLimitService from "./cacheService.js";
import ContextAccessService from "./contextAccessService.js";
import type { RequestContext } from "../tools/context.js";

@Service()
export default class ToolSecurityService {
	@Inject(() => RateLimitService)
	private readonly rateLimitService!: RateLimitService;

	@Inject(() => ContextAccessService)
	private readonly accessService!: ContextAccessService;

	public async verifyToolRequest(
		request: RequestContext,
		toolName: string,
		allowedRolesArray?: string[],
	): Promise<void> {
		console.info(
			`\nTool access | ${new Date().toLocaleString()} - ${toolName} ${request.clientIp}\n`,
		); // Log the tool name and client IP address

		const isValidContextAccess: boolean | string =
			await this.accessService.isValidContextAccess();

		if (typeof isValidContextAccess === "string") {
			throw new Error(isValidContextAccess);
		}

		if (allowedRolesArray) {
			if (!allowedRolesArray.includes(request.user.role)) {
				throw new Error(
					"Forbidden! You are not allowed to access this resource",
				);
			}
		}

		const rateLimitCheck: { isPass: boolean; remainingTtlInSecond: number } =
			await this.rateLimitService.isPassUserIdRateLimit(request.user.id);

		if (!rateLimitCheck.isPass) {
			throw new Error(
				`Rate limit exceeded ! try again in ${rateLimitCheck.remainingTtlInSecond} seconds`,
			);
		}
	}
}
