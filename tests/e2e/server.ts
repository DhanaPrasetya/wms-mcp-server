import "reflect-metadata";
import express, { type Express } from "express";
import { Container } from "typedi";
import router from "../../src/routes/mcpRoute.js";
import ContextAccessService from "../../src/services/contextAccessService.js";

const app: Express = express();
const port: number = Number(process.env.E2E_PORT ?? 4173);

const contextAccess: string = JSON.stringify({
	whitelist_ips: [],
	start_time: "00:00",
	end_time: "23:59",
});

const contextAccessService: ContextAccessService =
	Container.get(ContextAccessService);
Object.defineProperty(contextAccessService, "cacheService", {
	value: { get: async () => contextAccess },
});

app.use(express.json());
app.use("/mcp", router);
app.listen(port, "127.0.0.1", () => {
	console.log(`E2E server listening on http://127.0.0.1:${port}`);
});
