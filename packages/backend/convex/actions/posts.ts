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

		// Verify all emailIds belong to the user's organization
		const uniqueEmailIds = [
			...new Set(args.selectedImages.map((img) => img.emailId)),
		];
		const emails = await Promise.all(
			uniqueEmailIds.map((emailId) =>
				ctx.runQuery(api.queries.emails.getEmailById, {
					emailId,
				}),
			),
		);

		// Check that all emails exist and belong to the user's organization
		for (let i = 0; i < emails.length; i++) {
			const email = emails[i];
			if (!email) {
				throw new Error(`Email not found: ${uniqueEmailIds[i]}`);
			}
			if (email.organizationId !== organizationId) {
				throw new Error(
					`Email ${uniqueEmailIds[i]} does not belong to your organization`,
				);
			}
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
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		postsGenerated: number;
		message: string;
	}> => {
		const { organizationId } = args;

		console.log(
			`[Cron] Starting post generation for organization: ${organizationId}`,
		);

		// Calculate today's date range
		const offset = Number.parseInt(process.env.TIMEZONE_OFFSET || "-5", 10);
		const now = new Date();
		const utcNow = new Date(now.getTime() + offset * 60 * 60 * 1000);
		const start = new Date(utcNow);
		start.setUTCHours(0, 0, 0, 0);
		start.setTime(start.getTime() - offset * 60 * 60 * 1000);
		const end = new Date(utcNow);
		end.setUTCHours(23, 59, 59, 999);
		end.setTime(end.getTime() - offset * 60 * 60 * 1000);

		// Fetch emails with images for today's date range
		const emails: EmailWithImages[] = await ctx.runQuery(
			api.queries.emails.fetchEmailsWithImagesForDateRange,
			{
				startDate: start.getTime(),
				endDate: end.getTime(),
				organizationId,
			},
		);

		if (emails.length === 0) {
			console.log(
				`[Cron] No emails with images found for organization: ${organizationId}`,
			);
			return {
				success: true,
				postsGenerated: 0,
				message: "No emails with images found",
			};
		}

		console.log(
			`[Cron] Found ${emails.length} emails with images for organization: ${organizationId}`,
		);

		// Get emailIds that already have posts
		const emailIds = emails.map((email) => email.id);
		const emailIdsWithPosts = await ctx.runQuery(
			api.queries.posts.getEmailIdsWithPosts,
			{ emailIds },
		);

		const emailIdsWithPostsSet = new Set(emailIdsWithPosts);

		// Filter emails: skip those with existing posts and those with no images
		const emailsToProcess = emails.filter((email) => {
			// Skip emails that already have posts
			if (emailIdsWithPostsSet.has(email.id)) {
				return false;
			}
			// Skip emails with no images (explicit check even though query filters them)
			if (!email.imageUrls || email.imageUrls.length === 0) {
				return false;
			}
			return true;
		});

		if (emailsToProcess.length === 0) {
			console.log(
				`[Cron] No emails to process (all have posts or no images) for organization: ${organizationId}`,
			);
			return {
				success: true,
				postsGenerated: 0,
				message: "No emails to process (all have posts or no images)",
			};
		}

		console.log(
			`[Cron] Processing ${emailsToProcess.length} emails for organization: ${organizationId}`,
		);

		// Generate posts using AI
		let generatedPosts: GeneratedPost[];
		try {
			generatedPosts = await generateInstagramCaptions(emailsToProcess, now);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Cron] Failed to generate posts for organization ${organizationId}:`,
				errorMessage,
			);
			throw new Error(`Failed to generate posts: ${errorMessage}`);
		}

		if (generatedPosts.length === 0) {
			console.log(
				`[Cron] No posts generated by AI for organization: ${organizationId}`,
			);
			return {
				success: true,
				postsGenerated: 0,
				message: "No posts generated by AI",
			};
		}

		// Save generated posts
		try {
			const savedPosts: Array<{
				_id: string;
				_creationTime: number;
				captionText: string;
				imageUrl?: string;
				imageStorageId?: string;
				createdAt: number;
				organizationId?: string;
				emailId?: string;
				sourceImageUrl?: string;
				suggestedImage?: string;
				isUserGenerated: boolean;
				sourceImageUrls?: string[];
			} | null> = await ctx.runMutation(api.mutations.posts.createPosts, {
				posts: generatedPosts.map(
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

			const postsCount = savedPosts.filter(
				(post): post is NonNullable<typeof post> => post !== null,
			).length;
			console.log(
				`[Cron] Successfully generated and saved ${postsCount} posts for organization: ${organizationId}`,
			);

			return {
				success: true,
				postsGenerated: postsCount,
				message: `Successfully generated ${postsCount} posts`,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Cron] Failed to save posts for organization ${organizationId}:`,
				errorMessage,
			);
			throw new Error(`Failed to save posts: ${errorMessage}`);
		}
	},
});
