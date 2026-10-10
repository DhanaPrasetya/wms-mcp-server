import express from "express";
import type { Request, Response } from "express";
import MCPTools from "../tools/server.js";
// import AuthService from "../services/authService.js";
const router: express.Router = express.Router();
const mcpTools: MCPTools = new MCPTools();

router.post("/", async (request: Request, response: Response) => {
	await mcpTools.handleRequest(request, response);
});

router.get("/", async (request: Request, response: Response) => {
	await mcpTools.handleSessionRequest(request, response);
});

router.delete("/", async (request: Request, response: Response) => {
	await mcpTools.handleSessionRequest(request, response);
});

export default router;
