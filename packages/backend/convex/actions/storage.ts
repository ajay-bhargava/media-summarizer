"use node";

import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const runCronStorageCleanup = internalAction({
	handler: async (ctx) => {
		const retentionDays = Number.parseInt(
			process.env.STORAGE_RETENTION_DAYS || "30",
			10,
		);
		const cutOffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		// Get all posts with images older than the cut off date
		const oldPosts = await ctx.runQuery(api.queries.posts.getPostsOlderThan, {
			cutoffDate: cutOffDate,
		});

		let deletedCount = 0;

		for (const post of oldPosts) {
			if (post.imageStorageId) {
				await ctx.storage.delete(post.imageStorageId);
			}
			deletedCount++;
		}

		return { deletedCount };
	},
});
