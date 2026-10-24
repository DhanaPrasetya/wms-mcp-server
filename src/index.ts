import "reflect-metadata";
import express from "express";
import type { Request, Response } from "express";
import router from "./routes/mcpRoute.js";
import dotenv from "dotenv";
import { connectRedis } from "./config/redis.js";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import cors from "cors";

dotenv.config();

await connectRedis();

const app: express.Application = express();
const PORT: string | number = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

const limiter: ReturnType<typeof rateLimit> = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	limit: 30, // Limit each IP to 30 requests per `window`
	standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
app.use(morgan("dev"));

morgan.token("local", () => {
	return new Date().toLocaleString();
});

app.use(
	morgan(
		'\n:local :remote-addr ":method :url" :status :response-time ms - :user-agent',
	),
);

app.use(cors()); // Enable CORS * for all routes & tools

app.set("trust proxy", 1); // Enable if behind a single reverse proxy

// Use the routes
app.use("/mcp", router);

app.get(
	"/.well-known/oauth-protected-resource",
	(_req: Request, res: Response) => {
		res.json({
			resource: `${process.env.MCP_SERVER_URL}/mcp`,
			authorization_servers: [process.env.API_BASE_URL],
			bearer_methods_supported: ["header"],
			scopes_supported: ["mcp"],
		});
	},
);

// Basic Route with typed request and response parameters
app.get("/", (req: Request, res: Response) => {
	res.json({ message: "Reached !" });
});

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
