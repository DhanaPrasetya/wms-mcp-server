import { Service, Inject } from "typedi";
import CacheService from "./cacheService.js";

export type contextAccess = {
	whitelist_ips: string[];
	start_time: string;
	end_time: string;
};

const CONTEXT_CACHE_KEY: string = "settings:context";

@Service()
export default class ContextAccessService {
	@Inject(() => CacheService)
	private readonly cacheService: CacheService;

	private async getContexAccess(): Promise<contextAccess> {
		let contextData: contextAccess = {
			whitelist_ips: [],
			start_time: "",
			end_time: "",
		};

		const cachedContext: string | null =
			await this.cacheService.get(CONTEXT_CACHE_KEY);

		if (cachedContext) {
			return JSON.parse(cachedContext) as contextAccess;
		}

		const response: Response = await fetch(
			`${process.env.CONTEXT_ACCESS_URL}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error("Failed to fetch context access data");
		}

		const responseData: {
			whitelist_ips: string[];
			start_time: string;
			end_time: string;
		} = (await response.json()) as {
			whitelist_ips: string[];
			start_time: string;
			end_time: string;
		};
		contextData = {
			whitelist_ips: responseData.whitelist_ips,
			start_time: responseData.start_time,
			end_time: responseData.end_time,
		};

		return contextData;
	}

	private timeToMinutes(timeStr: string): number {
		const [hours, minutes] = timeStr.split(":").map(Number);
		return hours * 60 + (minutes || 0);
	}

	public async isValidContextAccess(): Promise<boolean | string> {
		const contextAccess: contextAccess = await this.getContexAccess();

		const now: Date = new Date();
		const currentMinutes: number = now.getHours() * 60 + now.getMinutes();

		const startMinutes: number = this.timeToMinutes(contextAccess.start_time);
		const endMinutes: number = this.timeToMinutes(contextAccess.end_time);

		// Check range (handles standard daytime ranges and overnight ranges)
		const isWithinHours: boolean =
			startMinutes <= endMinutes
				? currentMinutes >= startMinutes && currentMinutes <= endMinutes
				: currentMinutes >= startMinutes || currentMinutes <= endMinutes;

		if (!isWithinHours) {
			return "\nForbidden: Access is not allowed outside work hours";
		}

		return true;
	}
}
