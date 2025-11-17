import { v } from "convex/values";
import { query } from "../_generated/server";

export const getUserProfile = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.first();

		if (!profile) return null;

		const organization = await ctx.db.get(profile.organizationId);
		return {
			...profile,
			organization,
		};
	},
});

export const getCurrentUserProfile = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const userId = identity.subject;
		const profile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!profile) {
			return null;
		}

		const organization = await ctx.db.get(profile.organizationId);
		return {
			...profile,
			organization,
		};
	},
});

export const getOrganizationUsers = query({
	args: { organizationId: v.id("organizations") },
	handler: async (ctx, args) => {
		const profiles = await ctx.db
			.query("userProfiles")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.collect();

		// Enrich with organization data
		return Promise.all(
			profiles.map(async (profile) => {
				const organization = await ctx.db.get(profile.organizationId);
				return {
					...profile,
					organization,
				};
			}),
		);
	},
});
