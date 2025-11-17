import { v } from "convex/values";
import { query } from "../_generated/server";

export const getOrganizationByRecipientEmail = query({
	args: { recipientEmail: v.string() },
	handler: async (ctx, args) => {
		const normalizedEmail = args.recipientEmail.toLowerCase().trim();
		return ctx.db
			.query("organizations")
			.withIndex("by_recipient_email", (q) =>
				q.eq("recipientEmail", normalizedEmail),
			)
			.first();
	},
});

export const getOrganizationById = query({
	args: { orgId: v.id("organizations") },
	handler: async (ctx, args) => {
		return ctx.db.get(args.orgId);
	},
});

export const getOrganizationByDomain = query({
	args: { domain: v.string() },
	handler: async (ctx, args) => {
		const normalizedDomain = args.domain.toLowerCase().trim().replace(/^@/, "");

		if (!normalizedDomain) {
			throw new Error("Domain is required to lookup organization");
		}

		// Get all organizations and filter by domain
		const allOrgs = await ctx.db.query("organizations").collect();
		const matching = allOrgs.filter((org) =>
			org.recipientEmail.toLowerCase().includes(`@${normalizedDomain}`),
		);

		if (matching.length === 0) {
			return null;
		}

		if (matching.length > 1) {
			throw new Error(
				"Multiple organizations found for that domain. Please use the full forwarding email.",
			);
		}

		return matching[0];
	},
});

export const listOrganizations = query({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db.query("organizations").collect();
		// Sort by createdAt descending
		return orgs.sort((a, b) => b.createdAt - a.createdAt);
	},
});

export const isRecipientEmailAvailable = query({
	args: { recipientEmail: v.string() },
	handler: async (ctx, args) => {
		const normalizedEmail = args.recipientEmail.toLowerCase().trim();
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_recipient_email", (q) =>
				q.eq("recipientEmail", normalizedEmail),
			)
			.first();
		return !existing;
	},
});

export const getOrganizationMemberCount = query({
	args: { organizationId: v.id("organizations") },
	handler: async (ctx, args) => {
		const profiles = await ctx.db
			.query("userProfiles")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.collect();
		return profiles.length;
	},
});
