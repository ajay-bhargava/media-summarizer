import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

export const getEmails = query({
	args: {
		organizationId: v.optional(v.id("organizations")),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;
		const offset = args.offset ?? 0;

		const emails = await ctx.db
			.query("emails")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", args.organizationId as Id<"organizations">),
			)
			.order("desc")
			.collect();

		return emails.slice(offset, offset + limit);
	},
});

export const getEmailById = query({
	args: { emailId: v.id("emails") },
	handler: async (ctx, args) => {
		const email = await ctx.db.get(args.emailId);
		if (!email) return null;

		const parsedContent = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();

		return { ...email, parsedContent };
	},
});

export const getEmailByIdWithOrg = query({
	args: {
		emailId: v.id("emails"),
		organizationId: v.optional(v.id("organizations")),
	},
	handler: async (ctx, args) => {
		const email = await ctx.db.get(args.emailId);
		if (!email || email.organizationId !== args.organizationId) {
			return null;
		}

		const parsedContent = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();

		return { ...email, parsedContent };
	},
});

export const getEmailsForDateRange = query({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		organizationId: v.optional(v.id("organizations")),
	},
	handler: async (ctx, args) => {
		let query = ctx.db.query("emails").withIndex("by_received_at");

		if (args.organizationId) {
			query = ctx.db
				.query("emails")
				.withIndex("by_organization", (q) =>
					q.eq("organizationId", args.organizationId as Id<"organizations">),
				);
		}

		const emails = await query.collect();

		return emails.filter((email) => {
			const matchesDate =
				email.receivedAt >= args.startDate && email.receivedAt <= args.endDate;
			const matchesOrg = args.organizationId
				? email.organizationId === args.organizationId
				: true;
			return matchesDate && matchesOrg;
		});
	},
});

export const getEmailsWithParsedContent = query({
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

		const emails = await ctx.db
			.query("emails")
			.withIndex("by_organization", (q) =>
				q.eq("organizationId", profile.organizationId),
			)
			.collect();

		return Promise.all(
			emails.map(async (email) => {
				const parsedContent = await ctx.db
					.query("parsedEmailContent")
					.withIndex("by_email", (q) => q.eq("emailId", email._id))
					.first();
				return { ...email, parsedContent };
			}),
		);
	},
});

export const getParsedEmailContent = query({
	args: { emailId: v.id("emails") },
	handler: async (ctx, args) => {
		return ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();
	},
});

export const fetchEmailsWithImagesForDateRange = query({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		let query = ctx.db.query("emails").withIndex("by_received_at");

		if (args.organizationId) {
			query = ctx.db
				.query("emails")
				.withIndex("by_organization", (q) =>
					q.eq("organizationId", args.organizationId),
				);
		}

		const emails = await query.collect();

		const filteredEmails = emails.filter((email) => {
			const matchesDate =
				email.receivedAt >= args.startDate && email.receivedAt <= args.endDate;
			const matchesOrg = args.organizationId
				? email.organizationId === args.organizationId
				: true;
			return matchesDate && matchesOrg;
		});

		const enriched = await Promise.all(
			filteredEmails.map(async (email) => {
				const parsedContent = await ctx.db
					.query("parsedEmailContent")
					.withIndex("by_email", (q) => q.eq("emailId", email._id))
					.first();
				return {
					...email,
					parsedContent,
				};
			}),
		);

		return enriched
			.filter(
				(email) =>
					email.parsedContent?.imageUrls &&
					email.parsedContent.imageUrls.length > 0,
			)
			.map((email) => ({
				id: email._id,
				sender: email.sender,
				subject: email.subject,
				textContent: email.parsedContent?.textContent || email.rawText || "",
				imageUrls: email.parsedContent?.imageUrls || [],
				receivedAt: email.receivedAt,
			}));
	},
});
