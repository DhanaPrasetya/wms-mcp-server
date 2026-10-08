import express from "express";
import type { Request, Response } from "express";
import MCPTools from "../tools/tools.js";

const router: express.Router = express.Router();

router.post("/", async (request: Request, response: Response) => {
	const mcpTools: MCPTools = new MCPTools();
	await mcpTools.handleRequest(request, response);
});

router.get("/", async (request: Request, response: Response) => {
	const mcpTools: MCPTools = new MCPTools();
	await mcpTools.handleSessionRequest(request, response);
});

router.delete("/", async (request: Request, response: Response) => {
	const mcpTools: MCPTools = new MCPTools();
	await mcpTools.handleSessionRequest(request, response);
});

export default router;
