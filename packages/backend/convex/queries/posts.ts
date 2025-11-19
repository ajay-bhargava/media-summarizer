import { v } from "convex/values";
import { query } from "../_generated/server";

export const getPosts = query({
	args: {
		organizationId: v.optional(v.id("organizations")),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;
		const offset = args.offset ?? 0;

		const posts = await ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.order("desc")
			.collect();

		// Manual pagination
		return posts.slice(offset, offset + limit);
	},
});

export const getPostsByEmail = query({
	args: { emailId: v.id("emails") },
	handler: async (ctx, args) => {
		return ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.collect();
	},
});

export const getPostsOlderThan = query({
	args: { cutoffDate: v.number() },
	handler: async (ctx, args) => {
		const posts = await ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_created_at")
			.collect();

		return posts.filter((post) => post.createdAt < args.cutoffDate);
	},
});

export const getPostsWithOrganization = query({
	args: {},
	handler: async (ctx) => {
		// Check authentication
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		// Get user's organizationId from their profile
		const userId = identity.subject;
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!profile) {
			return [];
		}

		const posts = await ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", profile.organizationId),
			)
			.order("desc")
			.collect();

		return posts;
	},
});

export const getEmailIdsWithPosts = query({
	args: {
		emailIds: v.array(v.id("emails")),
	},
	handler: async (ctx, args) => {
		if (args.emailIds.length === 0) {
			return [];
		}

		// Get all posts for the given emailIds
		const allPosts = await Promise.all(
			args.emailIds.map((emailId) =>
				ctx.db
					.query("aiGeneratedPosts")
					.withIndex("by_email", (q) => q.eq("emailId", emailId))
					.collect(),
			),
		);

		// Return array of emailIds that have at least one post
		return args.emailIds.filter((_, index) => allPosts[index].length > 0);
	},
});

export const getPostsForDateRange = query({
	args: {
		organizationId: v.id("organizations"),
		startDate: v.number(),
		endDate: v.number(),
		includeUserGenerated: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const includeUserGenerated = args.includeUserGenerated ?? false;

		// Get all posts for the organization
		const allPosts = await ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.collect();

		// Filter by date range and optionally by isUserGenerated
		return allPosts.filter((post) => {
			const inDateRange =
				post.createdAt >= args.startDate && post.createdAt <= args.endDate;
			if (!inDateRange) {
				return false;
			}

			// If includeUserGenerated is false, only return cron-generated posts
			if (!includeUserGenerated) {
				return post.isUserGenerated === false;
			}

			// If includeUserGenerated is true, return all posts
			return true;
		});
	},
});
