import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function toolError(message: string): CallToolResult {
	return { isError: true, content: [{ type: "text", text: message }] };
}

export function toolText(data: unknown): CallToolResult {
	return {
		content: [
			{
				type: "text",
				text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
			},
		],
	};
}
