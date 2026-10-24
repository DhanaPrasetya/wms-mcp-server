import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { Container } from "typedi";
import { GetPaginatedProductTool } from "./product/getPaginatedProduct.js";
import { requestContext, RequestContext } from "./context.js";

interface SessionEntry {
	server: McpServer;
	transport: StreamableHTTPServerTransport;
	lastActive: number;
}

const sessions: Map<string, SessionEntry> = new Map();

const SESSION_TIMEOUT_MS: number = 25 * 60 * 1000; // 25 minutes idle timeout
const SWEEP_INTERVAL_MS: number = 5 * 60 * 1000; // sweep every 5 minutes
const SERVER_NAME: string = "wms-mcp-server";
const SERVER_VERSION: string = "1.0.0";

function registerTools(server: McpServer): void {
	Container.get(GetPaginatedProductTool).register(server);
}

function createMcpServer(): McpServer {
	const server: McpServer = new McpServer({
		name: SERVER_NAME,
		version: SERVER_VERSION,
	});
	registerTools(server);
	return server;
}

let sweepStarted: boolean = false;

function startSessionSweeper(): void {
	if (sweepStarted) return;
	sweepStarted = true;

	setInterval(() => {
		const now: number = Date.now();
		for (const [sessionId, entry] of sessions.entries()) {
			if (now - entry.lastActive > SESSION_TIMEOUT_MS) {
				sessions.delete(sessionId);
				// closing the server also closes its transport
				entry.server.close().catch(() => {
					/* ignore errors from an already-dead transport */
				});
			}
		}
	}, SWEEP_INTERVAL_MS).unref();
}

function getSingleHeaderValue(
	header: string | string[] | undefined,
): string | undefined {
	return Array.isArray(header) ? header[0] : header;
}

function jsonRpcError(
	res: Response,
	status: number,
	message: string,
): Response {
	return res.status(status).json({
		jsonrpc: "2.0",
		error: { code: -32000, message },
		id: null,
	});
}

export default class MCPTools {
	constructor() {
		startSessionSweeper();
	}

	private async createSession(): Promise<SessionEntry> {
		const server: McpServer = createMcpServer();

		const transport: StreamableHTTPServerTransport =
			new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: (newSessionId) => {
					sessions.set(newSessionId, entry);
				},
			});

		const entry: SessionEntry = { server, transport, lastActive: Date.now() };

		transport.onclose = () => {
			if (transport.sessionId) sessions.delete(transport.sessionId);
		};

		await server.connect(transport);
		return entry;
	}

	private getRequestContext(req: Request, res: Response): RequestContext {
		return {
			req,
			res,
			clientIp: req.ip ?? req.socket.remoteAddress ?? "unknown",
			user: res.locals.user,
		};
	}

	private async handleTransportRequest(
		req: Request,
		res: Response,
		entry: SessionEntry,
		body?: unknown,
	): Promise<void> {
		entry.lastActive = Date.now();
		await requestContext.run(this.getRequestContext(req, res), () =>
			entry.transport.handleRequest(req, res, body),
		);
	}

	/** POST /mcp */
	public handleRequest = async (req: Request, res: Response) => {
		try {
			const sessionId: string | undefined = getSingleHeaderValue(
				req.headers["mcp-session-id"],
			);
			let entry: SessionEntry;

			if (sessionId) {
				const existing: SessionEntry | undefined = sessions.get(sessionId);
				if (!existing) {
					// Spec: unknown/expired session -> 404 so the client re-initializes
					return jsonRpcError(res, 404, "Session not found");
				}
				entry = existing;
			} else if (isInitializeRequest(req.body)) {
				entry = await this.createSession();
			} else {
				return jsonRpcError(
					res,
					400,
					"Bad Request: No valid session ID provided",
				);
			}

			await this.handleTransportRequest(req, res, entry, req.body);
		} catch (err) {
			if (!res.headersSent) {
				jsonRpcError(
					res,
					500,
					err instanceof Error ? err.message : String(err),
				);
			}
		}
	};

	/** GET /mcp (SSE stream) and DELETE /mcp (session termination) */
	public handleSessionRequest = async (req: Request, res: Response) => {
		const sessionId: string | undefined = getSingleHeaderValue(
			req.headers["mcp-session-id"],
		);
		if (!sessionId) {
			return jsonRpcError(res, 400, "Bad Request: Missing session ID");
		}

		const entry: SessionEntry | undefined = sessions.get(sessionId);
		if (!entry) {
			return jsonRpcError(res, 404, "Session not found");
		}

		try {
			await this.handleTransportRequest(req, res, entry);
		} catch (err) {
			if (!res.headersSent) {
				jsonRpcError(
					res,
					500,
					err instanceof Error ? err.message : String(err),
				);
			}
		}
	};
}
