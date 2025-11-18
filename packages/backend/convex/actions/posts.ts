"use node";

import { v } from "convex/values";
import { api } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import {
	generateCombinedPost,
	generateInstagramCaptions,
} from "../lib/aiGenerator";
import { CheckOrganizationMembership } from "../lib/auth";
import type { CreatePostInput, EmailWithImages, GeneratedPost } from "../types";

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
	handler: async (ctx, args): Promise<GeneratedPost[]> => {
		const { organizationId } = await CheckOrganizationMembership(ctx);

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
			const offset = Number.parseInt(process.env.TIMEZONE_OFFSET || "-5", 10);
			const utcNow = new Date(now.getTime() + offset * 60 * 60 * 1000);
			const start = new Date(utcNow);
			start.setUTCHours(0, 0, 0, 0);
			start.setTime(start.getTime() - offset * 60 * 60 * 1000);
			const end = new Date(utcNow);
			end.setUTCHours(23, 59, 59, 999);
			end.setTime(end.getTime() - offset * 60 * 60 * 1000);

			const _emails: EmailWithImages[] = await ctx.runQuery(
				api.queries.emails.fetchEmailsWithImagesForDateRange,
				{
					startDate: start.getTime(),
					endDate: end.getTime(),
					organizationId,
				},
			);
			if (_emails.length === 0) {
				throw new Error("No emails found for the given date range");
			}
			const generatedPosts = await generateInstagramCaptions(_emails, now);
			if (generatedPosts.length === 0) {
				throw new Error("No posts generated");
			}
			_posts = generatedPosts;
		}

		const savedPosts = await ctx.runMutation(api.mutations.posts.createPosts, {
			posts: _posts.map(
				(post): CreatePostInput => ({
					captionText: post.caption_text,
					imageUrl: post.source_image_url ?? undefined,
					imageStorageId: undefined,
					organizationId,
					emailId: post.email_id ?? undefined,
					sourceImageUrl: post.source_image_url ?? undefined,
					suggestedImage: undefined,
					sourceImageUrls: post.source_image_urls ?? undefined,
					isUserGenerated: post.is_user_generated ?? false,
				}),
			),
		});

		// Return the array of saved documents, filtering out any null values
		return savedPosts
			.filter((post) => post !== null)
			.map((post) => ({
				caption_text: post.captionText,
				created_at: post.createdAt,
				is_user_generated: post.isUserGenerated,
			}));
	},
});

export const runCronPostGeneration = internalAction({
	handler: async (ctx) => {
		const organizations = await ctx.runQuery(
			api.queries.organizations.listOrganizations,
		);

		if (!organizations.length) {
			throw new Error("[Cron]No organizations found");
		}

		const offset = Number.parseInt(process.env.TIMEZONE_OFFSET || "-5", 10);
		const utcNow = new Date(Date.now() + offset * 60 * 60 * 1000);
		const start = new Date(utcNow);
		start.setUTCHours(0, 0, 0, 0);
		start.setTime(start.getTime() - offset * 60 * 60 * 1000);
		const end = new Date(utcNow);
		end.setUTCHours(23, 59, 59, 999);
		end.setTime(end.getTime() - offset * 60 * 60 * 1000);
	},
});
