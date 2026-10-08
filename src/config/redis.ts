import { createClient, type RedisClientType } from "redis";

export const redisClient: RedisClientType = createClient({
	url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err: Error) => {
	console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
	console.log("Connected to Redis");
});

export const connectRedis = async (): Promise<void> => {
	if (!redisClient.isOpen) {
		await redisClient.connect();
	}
};

export default redisClient;
