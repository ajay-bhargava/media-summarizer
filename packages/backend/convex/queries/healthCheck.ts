import { query } from "../_generated/server";

export const get = query({
	args: {},
	handler: async (ctx) => {
		return {
			status: "ok",
			timestamp: Date.now(),
			database: "connected",
		};
	},
});
