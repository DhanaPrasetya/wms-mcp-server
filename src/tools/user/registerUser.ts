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
	role_id: z.uuid().describe("The role ID of the user to register."),
	email: z.email().describe("The email address of the user to register."),
	name: z.string().max(255).describe("The name of the user to register."),
	password: z
		.string()
		.min(6)
		.max(255)
		.describe("Password, at least 6 characters."),
	is_active: z
		.boolean()
		.optional()
		.describe("Defaults to true if not provided."),
};

@Service()
export class RegisterUserTool {
	@Inject(() => SecurityService)
	private readonly security!: SecurityService;

	// arrow property keeps `this` bound when passed to registerTool
	private handler: ToolCallback<typeof inputSchema> = async ({
		role_id,
		email,
		name,
		password,
		is_active,
	}) => {
		try {
			const requestContext: RequestContext = getRequestContext();
			const { req } = requestContext;

			await this.security.verifyToolRequest(requestContext, rootAdminOnly);

			await apiCall(httpMethod.POST, req.headers.authorization!, "/users", {
				role_id,
				email,
				name,
				password,
				is_active,
			});

			return toolText({ message: "User registered successfully" });
		} catch (err) {
			return toolError(err instanceof Error ? err.message : String(err));
		}
	};

	register(server: McpServer): void {
		server.registerTool(
			"registering_new_user",
			{
				title: "Register New User",
				description: "Register a new user in the system.",
				inputSchema,
				annotations: {
					readOnlyHint: false, // This tool is not read-only; it performs a write operation to register a new user.
					destructiveHint: true, // This tool is destructive; it modifies the system state by adding a new user.
					idempotentHint: false, // This tool is not idempotent; calling it multiple times with the same input will create the same users.
					openWorldHint: true, // This tool is interact with external systems
				},
			},
			this.handler,
		);
	}
}
