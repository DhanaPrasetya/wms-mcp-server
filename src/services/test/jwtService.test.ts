import jwt from "jsonwebtoken";
import type { VerifyErrors } from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JwtService, { type userData } from "../jwtService.js";

vi.mock("jsonwebtoken", () => ({
	default: { verify: vi.fn() },
}));

describe("JwtService", () => {
	const payload: userData = {
		id: "user-1",
		name: "Test User",
		role: "Manager",
		jti: "token-id",
		iat: 0,
		exp: 9999999999,
		iss: "test-issuer",
	};
	let service: JwtService;

	beforeEach(() => {
		service = new JwtService();
		vi.clearAllMocks();
		process.env.API_BASE_URL = "https://api.example.test";
	});

	it("resolves decoded user data from a valid token", async () => {
		vi.mocked(jwt.verify).mockImplementation(
			(_token, _key, _options, callback) => {
				if (typeof callback === "function") {
					callback(null, payload);
				}
				return undefined as never;
			},
		);

		await expect(service.verifyAuthToken("valid-token")).resolves.toEqual(
			payload,
		);
		expect(jwt.verify).toHaveBeenCalledWith(
			"valid-token",
			expect.any(Function),
			{ algorithms: ["RS256"], issuer: "https://api.example.test" },
			expect.any(Function),
		);
	});

	it("rejects when JWT verification fails", async () => {
		vi.mocked(jwt.verify).mockImplementation(
			(_token, _key, _options, callback) => {
				if (typeof callback === "function") {
					callback(
						{
							name: "JsonWebTokenError",
							message: "invalid token",
						} as VerifyErrors,
						undefined,
					);
				}
				return undefined as never;
			},
		);

		await expect(service.verifyAuthToken("invalid-token")).rejects.toThrow(
			"invalid token",
		);
	});

	it("rejects when the decoded token is not an object", async () => {
		vi.mocked(jwt.verify).mockImplementation(
			(_token, _key, _options, callback) => {
				if (typeof callback === "function") {
					callback(null, "not-an-object");
				}
				return undefined as never;
			},
		);

		await expect(service.verifyAuthToken("invalid-token")).rejects.toThrow(
			"Decoded token is undefined",
		);
	});
});
