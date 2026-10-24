import type { RequestContext } from "../../tools/context.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ToolSecurityService from "../toolSecurityService.js";

describe("ToolSecurityService", () => {
	const request: RequestContext = {
		req: {} as RequestContext["req"],
		res: {} as RequestContext["res"],
		clientIp: "127.0.0.1",
		user: {
			id: "user-1",
			name: "Test User",
			role: "Manager",
			jti: "token-id",
			iat: 0,
			exp: 9999999999,
			iss: "test-issuer",
		},
	};
	let accessService: { isValidContextAccess: ReturnType<typeof vi.fn> };
	let rateLimitService: { isPassUserIdRateLimit: ReturnType<typeof vi.fn> };
	let service: ToolSecurityService;

	beforeEach(() => {
		accessService = { isValidContextAccess: vi.fn().mockResolvedValue(true) };
		rateLimitService = {
			isPassUserIdRateLimit: vi.fn().mockResolvedValue({
				isPass: true,
				remainingTtlInSecond: 60,
			}),
		};
		service = new ToolSecurityService();
		Object.defineProperty(service, "accessService", { value: accessService });
		Object.defineProperty(service, "rateLimitService", {
			value: rateLimitService,
		});
		vi.spyOn(console, "info").mockImplementation(() => undefined);
	});

	it("allows a request with valid context, role, and rate limit", async () => {
		await expect(
			service.verifyToolRequest(request, "test-tool", ["Manager"]),
		).resolves.toBeUndefined();
		expect(accessService.isValidContextAccess).toHaveBeenCalledOnce();
		expect(rateLimitService.isPassUserIdRateLimit).toHaveBeenCalledWith(
			"user-1",
		);
	});

	it("rejects invalid context before checking role or rate limit", async () => {
		accessService.isValidContextAccess.mockResolvedValue("Context denied");

		await expect(
			service.verifyToolRequest(request, "test-tool"),
		).rejects.toThrow("Context denied");
		expect(rateLimitService.isPassUserIdRateLimit).not.toHaveBeenCalled();
	});

	it("rejects a role that is not allowed", async () => {
		await expect(
			service.verifyToolRequest(request, "test-tool", ["Sales"]),
		).rejects.toThrow("Forbidden! You are not allowed to access this resource");
		expect(rateLimitService.isPassUserIdRateLimit).not.toHaveBeenCalled();
	});

	it("rejects requests over the rate limit", async () => {
		rateLimitService.isPassUserIdRateLimit.mockResolvedValue({
			isPass: false,
			remainingTtlInSecond: 12,
		});

		await expect(
			service.verifyToolRequest(request, "test-tool"),
		).rejects.toThrow("Rate limit exceeded ! try again in 12 seconds");
	});
});
