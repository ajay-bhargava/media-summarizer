import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireOrganization, requireOrganizationMatch } from "../lib/auth";

export const createEmail = mutation({
	args: {
		sender: v.string(),
		recipient: v.string(),
		subject: v.optional(v.string()),
		rawText: v.optional(v.string()),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		await requireOrganizationMatch(ctx, args.organizationId);

		const emailId = await ctx.db.insert("emails", {
			sender: args.sender,
			recipient: args.recipient,
			subject: args.subject,
			rawText: args.rawText,
			organizationId: args.organizationId,
			receivedAt: Date.now(),
		});

		return await ctx.db.get(emailId);
	},
});

export const insertEmail = mutation({
	args: {
		sender: v.string(),
		recipient: v.string(),
		subject: v.optional(v.string()),
		rawText: v.optional(v.string()),
		textContent: v.optional(v.string()),
		imageUrls: v.optional(v.array(v.string())),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		// Verify user belongs to the organization
		await requireOrganizationMatch(ctx, args.organizationId);

		// Create the email
		const emailId = await ctx.db.insert("emails", {
			sender: args.sender,
			recipient: args.recipient,
			subject: args.subject,
			rawText: args.rawText,
			organizationId: args.organizationId,
			receivedAt: Date.now(),
		});

		// Create or update parsed content
		const existingContent = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", emailId))
			.first();

		if (existingContent) {
			await ctx.db.patch(existingContent._id, {
				textContent: args.textContent,
				imageUrls: args.imageUrls ?? [],
				processed: true,
			});
		} else {
			await ctx.db.insert("parsedEmailContent", {
				emailId,
				textContent: args.textContent,
				imageUrls: args.imageUrls ?? [],
				processed: true,
			});
		}

		return await ctx.db.get(emailId);
	},
});

export const updateEmailParsedContent = mutation({
	args: {
		emailId: v.id("emails"),
		textContent: v.optional(v.string()),
		imageUrls: v.optional(v.array(v.string())),
		processed: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Verify email belongs to user's organization
		const email = await ctx.db.get(args.emailId);
		if (!email) {
			throw new Error("Email not found");
		}

		await requireOrganizationMatch(ctx, email.organizationId);

		const existing = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				textContent: args.textContent,
				imageUrls: args.imageUrls,
				processed: args.processed,
			});
			return await ctx.db.get(existing._id);
		}
		const contentId = await ctx.db.insert("parsedEmailContent", {
			emailId: args.emailId,
			textContent: args.textContent,
			imageUrls: args.imageUrls ?? [],
			processed: args.processed ?? false,
		});
		return await ctx.db.get(contentId);
	},
});

export const deleteImage = mutation({
	args: {
		emailId: v.id("emails"),
		index: v.number(),
	},
	handler: async (ctx, args) => {
		// Verify email belongs to user's organization
		const email = await ctx.db.get(args.emailId);
		if (!email) {
			throw new Error("Email not found");
		}

		await requireOrganizationMatch(ctx, email.organizationId);

		const content = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();

		if (!content) throw new Error("Email content not found");

		const newUrls = [...(content.imageUrls || [])];
		newUrls.splice(args.index, 1);

		await ctx.db.patch(content._id, { imageUrls: newUrls });

		return { success: true };
	},
});

export const bulkDeleteImages = mutation({
	args: {
		images: v.array(
			v.object({
				emailId: v.id("emails"),
				index: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const { organizationId } = await requireOrganization(ctx);

		// Group images by emailId
		const imagesByEmail = args.images.reduce(
			(acc, img) => {
				const key = img.emailId as string;
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(img.index);
				return acc;
			},
			{} as Record<string, number[]>,
		);

		let deletedCount = 0;

		// Process each email's images
		for (const [emailIdStr, indices] of Object.entries(imagesByEmail)) {
			const emailId = emailIdStr as Id<"emails">;

			// Verify email belongs to organization
			const email = await ctx.db.get(emailId);
			if (!email) {
				continue;
			}
			if (email.organizationId !== organizationId) {
				continue;
			}

			// Get current image URLs
			const content = await ctx.db
				.query("parsedEmailContent")
				.withIndex("by_email", (q) => q.eq("emailId", emailId))
				.first();

			if (!content) continue;

			const currentUrls = content.imageUrls || [];
			const sortedIndices = indices.sort((a, b) => b - a);
			const newUrls = [...currentUrls];

			for (const index of sortedIndices) {
				if (index >= 0 && index < newUrls.length) {
					newUrls.splice(index, 1);
					deletedCount++;
				}
			}

			await ctx.db.patch(content._id, { imageUrls: newUrls });
		}

		return { success: true, deletedCount };
	},
});

export const clearEmailImageUrls = mutation({
	args: {
		emailIds: v.array(v.id("emails")),
	},
	handler: async (ctx, args) => {
		if (args.emailIds.length === 0) return [];

		const { organizationId } = await requireOrganization(ctx);

		const results = [];

		for (const emailId of args.emailIds) {
			const email = await ctx.db.get(emailId);
			if (!email || email.organizationId !== organizationId) {
				continue;
			}

			const content = await ctx.db
				.query("parsedEmailContent")
				.withIndex("by_email", (q) => q.eq("emailId", emailId))
				.first();

			if (content) {
				await ctx.db.patch(content._id, { imageUrls: [] });
				results.push(content);
			}
		}

		return results;
	},
});

export const updateParsedEmailContentImageUrls = mutation({
	args: {
		emailId: v.id("emails"),
		imageUrls: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const email = await ctx.db.get(args.emailId);
		if (!email) {
			throw new Error("Email not found");
		}

		await requireOrganizationMatch(ctx, email.organizationId);

		const existing = await ctx.db
			.query("parsedEmailContent")
			.withIndex("by_email", (q) => q.eq("emailId", args.emailId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, { imageUrls: args.imageUrls });
			return await ctx.db.get(existing._id);
		}

		const contentId = await ctx.db.insert("parsedEmailContent", {
			emailId: args.emailId,
			imageUrls: args.imageUrls,
			processed: false,
		});
		return await ctx.db.get(contentId);
	},
});
