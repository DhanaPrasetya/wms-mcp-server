import jwt from "jsonwebtoken";
import type { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import type { RequestContext } from "../tools/context.js";

export interface userData {
	id: string;
	name: string;
	role: string;
	jti: string;
	iat: number;
	exp: number;
	iss: string;
	// aud: string,
}

export default class JwtService {
	private getKey(header: JwtHeader, callback: SigningKeyCallback): void {
		const jwksUri: string | undefined = process.env.PUBLIC_KEY_URL;

		if (!jwksUri) {
			throw new Error("PUBLIC_KEY_URL is not defined in environment variables");
		}

		const client: jwksClient.JwksClient = jwksClient({
			jwksUri: jwksUri,
			cache: true, // Cache public keys locally
			cacheMaxEntries: 5,
			cacheMaxAge: 600000, // 10 minutes
			rateLimit: true,
			jwksRequestsPerMinute: 10,
		});

		client.getSigningKey(header.kid, (err, key) => {
			if (err) return callback(err);

			if (!key) {
				return callback(new Error("Signing key not found"));
			}
			const signingKey: string | undefined = key.getPublicKey();
			callback(null, signingKey);
		});
	}

	public async verifyAuthToken(request: RequestContext): Promise<userData> {
		const authHeader: string | undefined = request.req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Unauthorized: Missing or invalid Authorization header");
		}
		const authToken: string = authHeader.split(" ")[1];

		return new Promise((resolve, reject) => {
			jwt.verify(
				authToken,
				this.getKey.bind(this),
				{
					algorithms: ["RS256"],
					issuer: process.env.TOKEN_ISSUER,
				},
				(err, decoded) => {
					if (err) return reject(err);

					if (typeof decoded !== "object" || decoded === null) {
						reject(new Error("Decoded token is undefined"));
						return;
					}

					const userData: userData = decoded as userData;

					resolve(userData);
				},
			);
		});
	}
}
