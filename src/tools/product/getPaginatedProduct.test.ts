import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall } from "../../helper/apiCall.js";
import { getRequestContext, type RequestContext } from "../context.js";
import { GetPaginatedProductTool } from "./getPaginatedProduct.js";

vi.mock("../../helper/apiCall.js", () => ({
	apiCall: vi.fn(),
	HttpMethod: { GET: "GET" },
}));

vi.mock("../context.js", () => ({
	getRequestContext: vi.fn(),
}));

type SecurityServiceMock = {
	verifyToolRequest: ReturnType<typeof vi.fn>;
};

type RegisteredHandler = (input: {
	name?: string;
	page?: number;
	limit?: number;
	order_by?: "asc" | "desc";
}) => Promise<unknown>;

describe("GetPaginatedProductTool", () => {
	const requestContext: RequestContext = {
		req: { headers: { authorization: "Bearer test-token" } } as Request,
		res: {} as Response,
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
	let security: SecurityServiceMock;
	let handler: RegisteredHandler;

	beforeEach(() => {
		vi.clearAllMocks();
		security = {
			verifyToolRequest: vi.fn().mockResolvedValue(undefined),
		};
		vi.mocked(getRequestContext).mockReturnValue(requestContext as never);

		const registerTool: ReturnType<typeof vi.fn> = vi.fn(
			(_name: string, _options: unknown, callback: RegisteredHandler) => {
				handler = callback;
			},
		);
		const server: McpServer = { registerTool } as unknown as McpServer;
		const tool: GetPaginatedProductTool = new GetPaginatedProductTool();

		Object.defineProperty(tool, "security", { value: security });
		tool.register(server);
	});

	it("registers a handler that authorizes and fetches paginated products", async () => {
		vi.mocked(apiCall).mockResolvedValue({
			status: 200,
			data: [{ id: "product-1", name: "Widget" }],
		});

		const result: unknown = await handler({
			name: "Widget",
			page: 2,
			limit: 25,
			order_by: "asc",
		});

		expect(security.verifyToolRequest).toHaveBeenCalledWith(
			requestContext,
			"fetching_paginated_products",
			["Manager", "Operational", "Sales"],
		);
		expect(apiCall).toHaveBeenCalledWith({
			method: "GET",
			authToken: "Bearer test-token",
			endpoint: "/products",
			query: {
				name: "Widget",
				page: 2,
				limit: 25,
				order_by: "asc",
			},
		});
		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: '[\n  {\n    "id": "product-1",\n    "name": "Widget"\n  }\n]',
				},
			],
		});
	});

	it("returns a tool error when authorization fails", async () => {
		security.verifyToolRequest.mockRejectedValue(new Error("Forbidden"));

		const result: unknown = await handler({
			page: 1,
			limit: 10,
			order_by: "desc",
		});

		expect(apiCall).not.toHaveBeenCalled();
		expect(result).toEqual({
			isError: true,
			content: [{ type: "text", text: "Forbidden" }],
		});
	});

	it("returns an API error as a tool error", async () => {
		vi.mocked(apiCall).mockRejectedValue(new Error("Service unavailable"));

		const result: unknown = await handler({
			page: 1,
			limit: 10,
			order_by: "desc",
		});

		expect(result).toEqual({
			isError: true,
			content: [{ type: "text", text: "Service unavailable" }],
		});
	});
});
