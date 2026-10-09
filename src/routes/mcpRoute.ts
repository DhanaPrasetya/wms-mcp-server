import express from "express";
import type { Request, Response } from "express";
// import MCPTools from "../tools/tools.js";
import AuthService from "../services/authService.js";
const router: express.Router = express.Router();

// router.post("/", async (request: Request, response: Response) => {
// 	const mcpTools: MCPTools = new MCPTools();
// 	await mcpTools.handleRequest(request, response);
// });

// router.get("/", async (request: Request, response: Response) => {
// 	const mcpTools: MCPTools = new MCPTools();
// 	await mcpTools.handleSessionRequest(request, response);
// });

// router.delete("/", async (request: Request, response: Response) => {
// 	const mcpTools: MCPTools = new MCPTools();
// 	await mcpTools.handleSessionRequest(request, response);
// });

router.get("/auth-test", async (request: Request, response: Response) => {
	const authHeader: string | undefined = request.headers.authorization;
	if (!authHeader) return response.status(401).json({ error: "Missing token" });

	const authService: AuthService = new AuthService();
	try {
		await authService.verifyAuthToken(authHeader);
	} catch (error) {
		console.error("Token verification failed:", error);
		return response.status(401).json({ error: "Invalid token" });
	}

	response.status(200).json({ status: "ok" });
});

export default router;
