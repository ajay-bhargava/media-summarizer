import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrganization } from "../lib/auth";

export const createPost = mutation({
	args: {
		captionText: v.string(),
		imageUrl: v.optional(v.string()),
		imageStorageId: v.optional(v.id("_storage")),
		organizationId: v.id("organizations"),
		emailId: v.optional(v.id("emails")),
		sourceImageUrl: v.optional(v.string()),
		suggestedImage: v.optional(v.string()),
		sourceImageUrls: v.optional(v.array(v.string())),
		isUserGenerated: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const postId = await ctx.db.insert("aiGeneratedPosts", {
			captionText: args.captionText,
			imageUrl: args.imageUrl,
			imageStorageId: args.imageStorageId,
			organizationId: args.organizationId,
			emailId: args.emailId,
			sourceImageUrl: args.sourceImageUrl,
			suggestedImage: args.suggestedImage,
			sourceImageUrls: args.sourceImageUrls,
			isUserGenerated: args.isUserGenerated ?? false,
			createdAt: Date.now(),
		});

		return await ctx.db.get(postId);
	},
});

export const createPosts = mutation({
	args: {
		posts: v.array(
			v.object({
				captionText: v.string(),
				imageUrl: v.optional(v.string()),
				imageStorageId: v.optional(v.id("_storage")),
				organizationId: v.id("organizations"),
				emailId: v.optional(v.id("emails")),
				sourceImageUrl: v.optional(v.string()),
				suggestedImage: v.optional(v.string()),
				sourceImageUrls: v.optional(v.array(v.string())),
				isUserGenerated: v.optional(v.boolean()),
			}),
		),
	},
	handler: async (ctx, args) => {
		if (!Array.isArray(args.posts) || args.posts.length === 0) {
			return [];
		}

		const postIds = await Promise.all(
			args.posts.map((post) =>
				ctx.db.insert("aiGeneratedPosts", {
					captionText: post.captionText,
					imageUrl: post.imageUrl,
					imageStorageId: post.imageStorageId,
					organizationId: post.organizationId,
					emailId: post.emailId,
					sourceImageUrl: post.sourceImageUrl,
					suggestedImage: post.suggestedImage,
					sourceImageUrls: post.sourceImageUrls,
					isUserGenerated: post.isUserGenerated ?? false,
					createdAt: Date.now(),
				}),
			),
		);

		return Promise.all(postIds.map((id) => ctx.db.get(id)));
	},
});

export const deletePost = mutation({
	args: {
		postId: v.id("aiGeneratedPosts"),
	},
	handler: async (ctx, args) => {
		const { user } = await requireOrganization(ctx);

		// Verify post belongs to organization
		const post = await ctx.db.get(args.postId);
		if (!post || post.organizationId !== user.organizationId) {
			throw new Error("Post not found or unauthorized");
		}

		await ctx.db.delete(args.postId);
		return { success: true };
	},
});

export const deletePostsByIds = mutation({
	args: {
		postIds: v.array(v.id("aiGeneratedPosts")),
	},
	handler: async (ctx, args) => {
		if (args.postIds.length === 0) return [];

		const { user } = await requireOrganization(ctx);

		const deletedPosts = [];
		for (const postId of args.postIds) {
			const post = await ctx.db.get(postId);
			if (post && post.organizationId === user.organizationId) {
				await ctx.db.delete(postId);
				deletedPosts.push(post);
			}
		}

		return deletedPosts;
	},
});

export const deletePostsForDateRange = mutation({
	args: {
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { user } = await requireOrganization(ctx);

		let posts = await ctx.db
			.query("aiGeneratedPosts")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", user.organizationId),
			)
			.collect();

		if (args.startDate && args.endDate) {
			posts = posts.filter(
				(post) =>
					// biome-ignore lint/style/noNonNullAssertion: <There is a check for startDate and endDate>
					post.createdAt >= args.startDate! && post.createdAt <= args.endDate!,
			);
		}

		await Promise.all(posts.map((post) => ctx.db.delete(post._id)));

		return posts;
	},
});
