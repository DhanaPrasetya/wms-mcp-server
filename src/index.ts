import express from "express";
import type { Request, Response } from "express";
import router from "./routes/mcpRoute.js";
import dotenv from "dotenv";
import { connectRedis } from "./config/redis.js";

await connectRedis();

dotenv.config();

const app: express.Application = express();
const PORT: string | number = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Use the routes
app.use("/mcp", router);

// Basic Route with typed request and response parameters
app.get("/", (req: Request, res: Response) => {
	res.json({ message: "Hello from Express with TypeScript!" });
});

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
