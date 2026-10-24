import { beforeEach, describe, expect, it, vi } from "vitest";
import CacheService from "../cacheService.js";

describe("CacheService", () => {
	let repository: {
		getRateLimitCount: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
	};
	let service: CacheService;

	beforeEach(() => {
		repository = {
			getRateLimitCount: vi.fn(),
			get: vi.fn(),
		};
		service = new CacheService();
		Object.defineProperty(service, "rateLimitRepository", {
			value: repository,
		});
	});

	it.each([
		[80, true],
		[81, false],
	])(
		"returns pass=%s for a count at the rate limit boundary",
		async (count, isPass) => {
			repository.getRateLimitCount.mockResolvedValue({
				count,
				remainingTtlInSecond: 42,
			});

			await expect(service.isPassUserIdRateLimit("user-1")).resolves.toEqual({
				isPass,
				remainingTtlInSecond: 42,
			});
			expect(repository.getRateLimitCount).toHaveBeenCalledWith(
				"rate-limit:user-1",
			);
		},
	);

	it("delegates cache reads to the repository", async () => {
		repository.get.mockResolvedValue("cached-value");

		await expect(service.get("settings:context")).resolves.toBe("cached-value");
		expect(repository.get).toHaveBeenCalledWith("settings:context");
	});
});
