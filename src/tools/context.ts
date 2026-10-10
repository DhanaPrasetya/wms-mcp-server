import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";

export interface RequestContext {
	req: Request;
	clientIp: string;
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
