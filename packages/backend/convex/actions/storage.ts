"use node";

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

/**
 * Internal action to upload images from webhooks (no user auth required).
 * Used when processing email attachments.
 *
 * This is a V8 action (not Node) to support larger file sizes (16 MiB limit vs 5 MiB).
 */
export const uploadImageInternal = internalAction({
	args: {
		imageData: v.string(), // Base64 encoded image data
		contentType: v.string(),
		fileName: v.string(),
		organizationId: v.id("organizations"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		storageId: Id<"_storage">;
		url: string;
		storageFileName: string;
	}> => {
		const timestamp = new Date().toISOString().split("T")[0];

		// Decode base64 in V8 action (no Buffer available)
		// atob() decodes base64 to binary string
		const binaryString = atob(args.imageData);
		// Convert binary string to Uint8Array
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// Extract extension from contentType (e.g., "image/png" -> "png")
		const extension = args.contentType.split("/").pop() || "png";
		const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

		const storageId = await ctx.storage.store(
			new Blob([bytes], { type: args.contentType }),
			{},
		);
		const _storageFileName: string = `${args.organizationId}/${timestamp}-${sanitizedFileName}.${extension}`;

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
