export enum httpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}

export async function apiCall(
	method: httpMethod,
	authToken: string,
	endpoint: string,
	body?: object,
): Promise<object> {
	const data: object = await fetch(`${process.env.API_BASE_URL}${endpoint}`, {
		method: method,
		headers: {
			"Content-Type": "application/json",
			Authorization: authToken,
		},
		body: JSON.stringify({
			body,
		}),
	});

	return data;
}
