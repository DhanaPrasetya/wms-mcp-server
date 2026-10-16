import type {
	McpServer,
	ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { Inject, Service } from "typedi";
import { z } from "zod";
import { getRequestContext } from "../context.js";
import type { RequestContext } from "../context.js";
import { toolError, toolText } from "../toolsResponse.js";
import SecurityService from "../../services/securityService.js";
import { apiCall, httpMethod } from "../../helper/apiCall.js";
import { rootAdminOnly } from "../toolsAuthorization.js";

const inputSchema: z.ZodRawShape = {
	role_id: z
		.string()
		.uuid()
		.optional()
		.describe("The role ID of the user to register."),
	email: z
		.string()
		.optional()
		.describe("The email address of the user to register."),
	name: z
		.string()
		.max(255)
		.optional()
		.describe("The name of the user to register."),
	password: z.string().optional().describe("Password, at least 6 characters."),
	is_active: z
		.boolean()
		.optional()
		.describe("Defaults to true if not provided."),
};

@Service()
export class TestTool {
	@Inject(() => SecurityService)
	private readonly security!: SecurityService;

	// arrow property keeps `this` bound when passed to registerTool
	private handler: ToolCallback<typeof inputSchema> = async ({}) => {
		try {
			const requestContext: RequestContext = getRequestContext();
			const { req } = requestContext;

			await this.security.verifyToolRequest(requestContext, rootAdminOnly);

			await apiCall(httpMethod.GET, req.headers.authorization ?? "", "/");

			return toolText({ message: "Reachable" });
		} catch (err) {
			return toolError(err instanceof Error ? err.message : String(err));
		}
	};

	register(server: McpServer): void {
		server.registerTool(
			"test-tool",
			{
				title: "Test Tool",
				description: "A simple test tool.",
				inputSchema,
			},
			this.handler,
		);
	}
}
