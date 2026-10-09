import jwt from "jsonwebtoken";
import type { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export default class AuthService {
	private getKey(header: JwtHeader, callback: SigningKeyCallback): void {
		const client: jwksClient.JwksClient = jwksClient({
			jwksUri:
				process.env.PUBLIC_KEY_URL ||
				"http://localhost:3000/auth/.well-known/jwks.json",
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

	public async verifyAuthToken(authHeader: string): Promise<object | null> {
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

					resolve(decoded);
				},
			);
		});
	}
}
