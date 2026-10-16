import type { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import JwtService from "../services/jwtService.js";
import type { userData } from "../services/jwtService.js";

const jwtService: JwtService = Container.get(JwtService);

function resourceMetadata(res: Response): void {
	res.setHeader(
		"WWW-Authenticate",
		`Bearer resource_metadata="${process.env.MCP_SERVER_URL}/.well-known/oauth-protected-resource"`,
	);
	res.status(401).send("Unauthorized");
}

export async function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const authHeader: string | undefined = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		resourceMetadata(res);
		return;
	}

	try {
		const authenticatedUser: userData = await jwtService.verifyAuthToken(
			authHeader.slice("Bearer ".length),
		);
		res.locals.user = authenticatedUser;
		next();
	} catch (error) {
		if (!res.headersSent) {
			resourceMetadata(res);
		}
		console.error(error);
	}
}
