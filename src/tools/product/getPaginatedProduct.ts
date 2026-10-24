import type {
	McpServer,
	ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { Inject, Service } from "typedi";
import { z } from "zod";
import { getRequestContext } from "../context.js";
import type { RequestContext } from "../context.js";
import { toolError, toolText } from "../toolsResponse.js";
import ToolSecurityService from "../../services/toolSecurityService.js";
import { apiCall, HttpMethod, ApiResponse } from "../../helper/apiCall.js";
import { managerOperationalSalesOnly } from "../toolsAuthorization.js";
import { OrderBy, Pagination } from "../../enums/tool.js";

const inputSchema: z.ZodRawShape = {
	name: z
		.string()
		.max(255)
		.max(1)
		.optional()
		.describe("The name of product to be searched."),
	page: z
		.number()
		.int()
		.min(1)
		.default(1)
		.optional()
		.describe("The page number for pagination."),
	limit: z
		.number()
		.int()
		.min(1)
		.max(Pagination.limitMax)
		.default(Pagination.limitDefault)
		.optional()
		.describe("The number of data to return per page."),
	order_by: z
		.enum(Object.values(OrderBy))
		.default(OrderBy.desc)
		.optional()
		.describe("The order by for sorting the results with 'desc' as default."),
};

@Service()
export class GetPaginatedProductTool {
	@Inject(() => ToolSecurityService)
	private readonly security: ToolSecurityService;

	// arrow property keeps `this` bound when passed to registerTool
	private handler: ToolCallback<typeof inputSchema> = async ({
		name,
		page,
		limit,
		order_by,
	}) => {
		try {
			const requestContext: RequestContext = getRequestContext();
			const { req } = requestContext;

			await this.security.verifyToolRequest(
				requestContext,
				"fetching_paginated_products",
				managerOperationalSalesOnly,
			);

			const data: ApiResponse<object> = await apiCall({
				method: HttpMethod.GET,
				authToken: req.headers.authorization,
				endpoint: "/products",
				query: {
					name,
					page,
					limit,
					order_by,
				},
			});

			return toolText(data.data);
		} catch (err) {
			return toolError(err instanceof Error ? err.message : String(err));
		}
	};

	register(server: McpServer): void {
		server.registerTool(
			"fetching_paginated_products",
			{
				title: "Fetch Paginated Products",
				description: "Fetch a list of products with pagination.",
				inputSchema,
				annotations: {
					readOnlyHint: true, // This tool is read-only; it only fetches data and does not modify the system.
					destructiveHint: false, // This tool is not destructive; it does not modify the system state.
					idempotentHint: true, // This tool is idempotent; calling it multiple times with the same input will produce the same result.
					openWorldHint: true, // This tool is interact with external systems
				},
			},
			this.handler,
		);
	}
}
