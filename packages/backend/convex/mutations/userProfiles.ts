import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createUserProfile = mutation({
	args: {
		userId: v.string(),
		organizationId: v.id("organizations"),
		role: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const profileId = await ctx.db.insert("userProfiles", {
			userId: args.userId,
			organizationId: args.organizationId,
			role: args.role ?? "member",
			createdAt: Date.now(),
		});

		return await ctx.db.get(profileId);
	},
});

export const updateUserProfile = mutation({
	args: {
		userId: v.string(),
		organizationId: v.optional(v.id("organizations")),
		role: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.first();

		if (!profile) {
			throw new Error("User profile not found");
		}

		const updates: {
			organizationId?: typeof args.organizationId;
			role?: string;
		} = {};

		if (args.organizationId !== undefined) {
			updates.organizationId = args.organizationId;
		}

		if (args.role !== undefined) {
			updates.role = args.role;
		}

		await ctx.db.patch(profile._id, updates);
		return await ctx.db.get(profile._id);
	},
});

export const assignUserToOrganization = mutation({
	args: {
		userId: v.string(),
		organizationId: v.id("organizations"),
		role: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existingProfile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.first();

		if (existingProfile) {
			if (
				existingProfile.organizationId &&
				existingProfile.organizationId !== args.organizationId
			) {
				throw new Error("User already assigned to an organization");
			}

			await ctx.db.patch(existingProfile._id, {
				organizationId: args.organizationId,
				role: args.role ?? existingProfile.role,
			});

			return await ctx.db.get(existingProfile._id);
		}

		const profileId = await ctx.db.insert("userProfiles", {
			userId: args.userId,
			organizationId: args.organizationId,
			role: args.role ?? "member",
			createdAt: Date.now(),
		});

		return await ctx.db.get(profileId);
	},
});
