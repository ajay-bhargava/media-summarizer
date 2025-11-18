"use node";

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { CheckOrganizationMembership } from "../lib/auth";

export const uploadImage = action({
	args: {
		imageData: v.string(), // Base64 encoded image data
		contentType: v.string(),
		fileName: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		storageId: Id<"_storage">;
		url: string;
		storageFileName: string;
	}> => {
		const { organizationId }: { organizationId: Id<"organizations"> } =
			await CheckOrganizationMembership(ctx);
		const timestamp = new Date().toISOString().split("T")[0];
		const buffer = Buffer.from(args.imageData, "base64");
		const extension = args.contentType.split(".").pop() || "png";
		const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
		const storageId = await ctx.storage.store(new Blob([buffer]), {});
		const _storageFileName: string = `${organizationId}/${timestamp}-${sanitizedFileName}.${extension}`;
		const url: string | null = await ctx.storage.getUrl(storageId);
		if (!url) {
			throw new Error("Failed to get storage URL");
		}
		return {
			storageId,
			url,
			storageFileName: _storageFileName,
		};
	},
});

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
