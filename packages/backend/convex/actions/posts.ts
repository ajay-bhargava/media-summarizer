"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { generateCombinedPost } from "../lib/aiGenerator";
import { CheckOrganizationMembership } from "../lib/auth";
import type { GeneratedPost } from "../types";
export const generatePost = action({
	args: {
		selectedImages: v.optional(
			v.array(
				v.object({
					imageUrl: v.string(),
					emailId: v.id("emails"),
					subject: v.optional(v.string()),
					sender: v.string(),
					textContent: v.optional(v.string()),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		await CheckOrganizationMembership(ctx);

		if (!args.selectedImages || args.selectedImages.length === 0) {
			throw new Error("No selected images provided");
		}
		const now = new Date();
		let _posts: GeneratedPost[] = [];
		if (args.selectedImages && args.selectedImages.length > 0) {
			if (args.selectedImages.length > 5) {
				throw new Error("Maximum of 5 images allowed");
			}
			const post = await generateCombinedPost({
				images: args.selectedImages.map((image) => ({
					imageUrl: image.imageUrl,
					emailId: image.emailId,
					subject: image.subject ?? "",
					sender: image.sender,
					textContent: image.textContent ?? "",
				})),
				date: now,
			});
			_posts = [{ ...post, is_user_generated: true }];
		} else {
			// Auto mode: generate posts from today's emails and an automatic selection
			const _offset = Number.parseInt(process.env.TIMEZONE_OFFSET || "-5", 10);
		}
	},
});
