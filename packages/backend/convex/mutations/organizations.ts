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

export const joinOrganization = mutation({
	args: {
		recipientEmail: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const userId = identity.subject;

		// Check if user already has an organization
		const existingProfile = await ctx.db
			.query("userProfiles")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (existingProfile) {
			const existingOrg = await ctx.db.get(existingProfile.organizationId);
			throw new Error(
				`User already belongs to organization: ${existingOrg?.name}`,
			);
		}

		// Find organization by recipient email
		const normalizedEmail = args.recipientEmail.toLowerCase().trim();
		const organization = await ctx.db
			.query("organizations")
			.withIndex("by_recipient_email", (q) =>
				q.eq("recipientEmail", normalizedEmail),
			)
			.first();

		if (!organization) {
			throw new Error(
				`No organization found with forwarding email: ${normalizedEmail}`,
			);
		}

		// Create user profile and join organization
		const profileId = await ctx.db.insert("userProfiles", {
			userId,
			organizationId: organization._id,
			role: "member",
			createdAt: Date.now(),
		});

		const profile = await ctx.db.get(profileId);

		return {
			...profile,
			organization,
		};
	},
});
