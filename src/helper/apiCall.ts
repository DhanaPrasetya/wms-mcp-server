export enum httpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}

type ApiResponse = {
	status: number;
};

export async function apiCall(
	method: httpMethod,
	authToken: string,
	endpoint: string,
	body?: object,
): Promise<ApiResponse> {
	const response: ApiResponse = await fetch(
		`${process.env.API_BASE_URL}${endpoint}`,
		{
			method: method,
			headers: {
				"Content-Type": "application/json",
				Authorization: authToken,
			},
			body: JSON.stringify({
				body,
			}),
		},
	);

	switch (response.status) {
		case 400:
			throw Error("Bad request response from wms-api");
		case 401:
			throw Error("Unauthorized request response from wms-api");
		case 403:
			throw Error("Forbidden request response from wms-api");
		case 404:
			throw Error("Not found response from wms-api");
		case 409:
			throw Error("Conflict response from wms-api");
		case 422:
			throw Error("Unprocessable entity response from wms-api");
		case 429:
			throw Error("Too many requests response from wms-api");
		case 500:
			throw Error("Internal server error response from wms-api");
		default:
			break;
	}

	return response;
}
