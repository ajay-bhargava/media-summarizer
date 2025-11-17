import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrganization } from "../lib/auth";

export const createOrganization = mutation({
	args: {
		name: v.string(),
		recipientEmail: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireOrganization(ctx);

		// Check if user already has organization
		const existingProfile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", user.user.userId))
			.first();

		if (existingProfile) {
			throw new Error("User already belongs to an organization");
		}

		// Check email availability
		const normalizedEmail = args.recipientEmail.toLowerCase().trim();
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_recipient_email", (q) =>
				q.eq("recipientEmail", normalizedEmail),
			)
			.first();

		if (existing) throw new Error("Email already taken");

		// Create organization
		const orgId = await ctx.db.insert("organizations", {
			name: args.name,
			recipientEmail: normalizedEmail,
			createdAt: Date.now(),
		});

		// Assign user as owner
		await ctx.db.insert("userProfiles", {
			userId: user.user.userId,
			organizationId: orgId,
			role: "owner",
			createdAt: Date.now(),
		});

		return await ctx.db.get(orgId);
	},
});
