import { expect, test, APIResponse } from "@playwright/test";

test("rejects an unauthenticated request and advertises the protected resource endpoint", async ({
	request,
}) => {
	const response: APIResponse = await request.get("/mcp");

	expect(response.status()).toBe(401);
	expect(await response.text()).toBe("Unauthorized");
	expect(response.headers()["www-authenticate"]).toContain(
		"/.well-known/oauth-protected-resource",
	);
});
