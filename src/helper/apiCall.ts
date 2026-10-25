export enum HttpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}

export type ApiResponse<T = unknown> = {
	status: number;
	data?: T;
};

export type ApiCallPayload = {
	method: HttpMethod;
	authToken?: string;
	endpoint: string;
	body?: Record<string, unknown>;
	query?: Record<string, string | number | boolean | unknown>;
	params?: Record<string, string | number>;
};

export async function apiCall<T = unknown>(
	payload: ApiCallPayload,
): Promise<ApiResponse<T>> {
	const { method, authToken, body, query, params } = payload;
	let { endpoint } = payload;

	if (params) {
		for (const [key, value] of Object.entries(params)) {
			endpoint = endpoint.replace(`:${key}`, encodeURIComponent(String(value)));
		}
	}

	const url: URL = new URL(endpoint, process.env.API_BASE_URL);

	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value));
			}
		}
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (authToken) {
		headers.Authorization = authToken.startsWith("Bearer ")
			? authToken
			: `Bearer ${authToken}`;
	}

	const fetchOptions: RequestInit = {
		method,
		headers,
	};

	if (body && method !== HttpMethod.GET) {
		fetchOptions.body = JSON.stringify(body);
	}

	const response: Response = await fetch(url.toString(), fetchOptions);

	switch (response.status) {
		case 400:
			throw new Error("Bad request !");
		case 401:
			throw new Error("Unauthorized !");
		case 403:
			throw new Error(
				"Forbidden! Either your are not connected on allowed network or accessing outside work hours",
			);
		case 404:
			throw new Error("Not found !");
		case 409:
			throw new Error("Conflict !");
		case 422:
			throw new Error("Unprocessable entity !");
		case 429:
			throw new Error("Too many requests !");
		case 500:
			console.error(
				`-----------------------\n${response}\n-----------------------`,
			);
			throw new Error("Internal server error !");
		case 502:
			console.error(
				`-----------------------\n${response}\n-----------------------`,
			);

			throw new Error("Bad gateway !");
		case 503:
			console.error(
				`-----------------------\n${response}\n-----------------------`,
			);

			throw new Error("Service unavailable !");
		case 504:
			console.error(
				`-----------------------\n${response}\n-----------------------`,
			);

			throw new Error("Gateway timeout !");
		default:
			console.error(
				`-----------------------\n${response}\n-----------------------`,
			);

			if (!response.ok) {
				throw new Error(`Unhandled error !`);
			}
			break;
	}

	// 7. Parse response body if available
	let data: T | undefined;
	const contentType: string | null = response.headers.get("content-type");

	if (contentType && contentType.includes("application/json")) {
		data = (await response.json()) as T;
	}

	return {
		status: response.status,
		data,
	};
}
