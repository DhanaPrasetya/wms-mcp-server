import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const server: McpServer = new McpServer({
	name: "wms-mcp-server",
	version: "1.0.0",
});

let serverInitialized: boolean = false;

// One transport per session, keyed by session ID, with idle tracking
interface SessionEntry {
	transport: StreamableHTTPServerTransport;
	lastActive: number;
}

const transports: Map<string, SessionEntry> = new Map();

const SESSION_TIMEOUT_MS: number = 25 * 60 * 1000; // 25 minutes idle timeout
const SWEEP_INTERVAL_MS: number = 5 * 60 * 1000; // sweep every 5 minutes

let sweepStarted: boolean = false;

function startSessionSweeper() {
	if (sweepStarted) return;
	sweepStarted = true;

	setInterval(() => {
		const now: number = Date.now();
		for (const [sessionId, entry] of transports.entries()) {
			if (now - entry.lastActive > SESSION_TIMEOUT_MS) {
				try {
					entry.transport.close(); // triggers onclose, which also deletes from the map
				} catch {
					// ignore close errors from an already-dead transport
				}
				transports.delete(sessionId); // safe even if onclose already removed it
			}
		}
	}, SWEEP_INTERVAL_MS).unref(); // unref so this timer doesn't keep the process alive on its own
}

function getSingleHeaderValue(
	header: string | string[] | undefined,
): string | undefined {
	return Array.isArray(header) ? header[0] : header;
}

interface RequestContext {
	clientIp: string;
}

const requestContext: AsyncLocalStorage<RequestContext> =
	new AsyncLocalStorage<RequestContext>();

export default class MCPTools {
	constructor() {
		this.setupTools();
		startSessionSweeper();
	}

	private async setupTools() {
		if (serverInitialized) return;

		server.registerTool(
			"get_my_submissions",
			{
				title: "Get My Submissions",
				description:
					"Retrieve a paginated list of the user's leave, sickness, or permit submissions. Use this tool when the user asks to see their past or current submission history.",
				inputSchema: {
					page: z
						.number()
						.optional()
						.describe("The page number for pagination. Defaults to 1."),
					limit: z
						.number()
						.optional()
						.describe("Number of items to return per page. Defaults to 10."),
					month: z
						.number()
						.optional()
						.describe(
							"Integer representing the month (1-12) to filter submissions.",
						),
					year: z
						.number()
						.optional()
						.describe(
							"Four-digit integer representing the year (e.g., 2024) to filter submissions.",
						),
				},
			},
			async () => {
				try {
					return {
						test: "value",
					};
				} catch (err: any) {
					return { test: "error" };
				}
			},
		);

		serverInitialized = true;
	}

	public async handleRequest(request: Request, response: Response) {
		const req: IncomingMessage = request;
		const res: ServerResponse = response;
		const body: Record<string, unknown> = request.body();
		let clientIp: string | undefined;
		if (request.ip) {
			clientIp = request.ip();
		}

		try {
			const sessionId = getSingleHeaderValue(req.headers["mcp-session-id"]);

			let transport: StreamableHTTPServerTransport;

			if (sessionId && transports.has(sessionId)) {
				// Reuse existing session's transport, refresh idle timer
				const entry = transports.get(sessionId)!;
				entry.lastActive = Date.now();
				transport = entry.transport;
			} else if (!sessionId && isInitializeRequest(body)) {
				// New session — create and register a fresh transport
				transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => uuidv4(),
					onsessioninitialized: (newSessionId) => {
						transports.set(newSessionId, { transport, lastActive: Date.now() });
					},
				});

				transport.onclose = () => {
					if (transport.sessionId) {
						transports.delete(transport.sessionId);
					}
				};

				try {
					await server.close();
				} catch {
					// ignore — no prior connection to tear down
				}
				await server.connect(transport);
			} else {
				// Has a session ID but it's unknown/expired, or missing session on a non-init request
				return response.status(400).json({
					jsonrpc: "2.0",
					error: {
						code: -32000,
						message: "Bad Request: No valid session ID provided",
					},
					id: null,
				});
			}

			await requestContext.run({ clientIp }, () =>
				transport.handleRequest(req, res, body),
			);
		} catch (err) {
			return response
				.status(500)
				.json({ error: err instanceof Error ? err.message : String(err) });
		}
	}

	public async handleSessionRequest(request: Request, response: Response) {
		// shared logic for GET (SSE stream) and DELETE (session termination)
		const req: IncomingMessage = request.request;
		const res: IncomingMessage = response.response;
		const clientIp: string = request.ip();

		const sessionId: string | undefined = getSingleHeaderValue(
			req.headers["mcp-session-id"],
		);
		const entry:
			| { transport: StreamableHTTPServerTransport; lastActive: number }
			| undefined = sessionId ? transports.get(sessionId) : undefined;

		if (!sessionId || !entry) {
			return response.status(400).json({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: "Bad Request: No valid session ID provided",
				},
				id: null,
			});
		}

		entry.lastActive = Date.now();
		await requestContext.run({ clientIp }, () =>
			entry.transport.handleRequest(req, res),
		);
	}
}
