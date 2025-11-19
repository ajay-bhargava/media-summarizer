import { v } from "convex/values";
import { query } from "../_generated/server";

export const getPosts = query({
	args: {
		organizationId: v.id("organizations"),
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
			.collect();

		// Sort by createdAt descending, then paginate
		const sortedPosts = posts.sort((a, b) => b.createdAt - a.createdAt);
		return sortedPosts.slice(offset, offset + limit);
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
