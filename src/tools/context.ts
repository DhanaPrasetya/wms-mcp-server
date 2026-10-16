import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response } from "express";
import type { userData } from "../services/jwtService.js";

export interface RequestContext {
	req: Request;
	res: Response;
	clientIp: string;
	user: userData;
}

export const requestContext: AsyncLocalStorage<RequestContext> =
	new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
	const ctx: RequestContext | undefined = requestContext.getStore();
	if (!ctx) {
		throw new Error("No request context available outside of a request");
	}
	return ctx;
}
