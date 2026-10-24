import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextAccessService from "../contextAccessService.js";

describe("ContextAccessService", () => {
	let cacheService: { get: ReturnType<typeof vi.fn> };
	let service: ContextAccessService;

	beforeEach(() => {
		cacheService = { get: vi.fn() };
		service = new ContextAccessService();
		Object.defineProperty(service, "cacheService", { value: cacheService });
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-10-24T10:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("uses cached context data when available", async () => {
		cacheService.get.mockResolvedValue(
			JSON.stringify({
				whitelist_ips: ["127.0.0.1"],
				start_time: "08:00",
				end_time: "17:00",
			}),
		);
		const fetchMock: ReturnType<typeof vi.spyOn> = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(() => {
				throw new Error("fetch should not be called");
			});

		await expect(service.isValidContextAccess()).resolves.toBe(true);
		expect(cacheService.get).toHaveBeenCalledWith("settings:context");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fetches context data when the cache is empty", async () => {
		cacheService.get.mockResolvedValue(null);
		const fetchMock: ReturnType<typeof vi.spyOn> = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(
					JSON.stringify({
						whitelist_ips: [],
						start_time: "08:00",
						end_time: "17:00",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

		await expect(service.isValidContextAccess()).resolves.toBe(true);
		expect(fetchMock).toHaveBeenCalledWith("undefined", {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		});
	});

	it("rejects when fetching context data fails", async () => {
		cacheService.get.mockResolvedValue(null);
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);

		await expect(service.isValidContextAccess()).rejects.toThrow(
			"Failed to fetch context access data",
		);
	});

	it("rejects access outside a normal work-hour range", async () => {
		cacheService.get.mockResolvedValue(
			JSON.stringify({
				whitelist_ips: [],
				start_time: "08:00",
				end_time: "17:00",
			}),
		);
		vi.setSystemTime(new Date("2026-10-24T18:00:00"));

		await expect(service.isValidContextAccess()).resolves.toBe(
			"\nForbidden: Access is not allowed outside work hours",
		);
	});

	it("allows access during an overnight work-hour range", async () => {
		cacheService.get.mockResolvedValue(
			JSON.stringify({
				whitelist_ips: [],
				start_time: "22:00",
				end_time: "06:00",
			}),
		);
		vi.setSystemTime(new Date("2026-10-24T23:00:00"));

		await expect(service.isValidContextAccess()).resolves.toBe(true);
	});
});
