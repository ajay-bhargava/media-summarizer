import { vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Internal mutation for inserting emails from webhooks.
 * Bypasses authentication since webhooks don't have user sessions.
 */
export const insertEmailFromWebhook = internalMutation({
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
		// Verify organization exists
		const organization = await ctx.db.get(args.organizationId);
		if (!organization) {
			throw new Error("Organization not found");
		}

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

/**
 * Handler for Resend email events (sent, delivered, bounced, etc.).
 * This is called by the Resend component when webhook events are received.
 * You can view these events in the Resend dashboard webhooks page.
 */
export const handleEmailEvent = internalMutation({
	args: vOnEmailEventArgs,
	handler: async (_ctx, args) => {
		const { id, event } = args;

		console.log("Email event received:", {
			emailId: id,
			eventType: event.type,
			createdAt: event.created_at,
			resendEmailId: event.data.email_id,
		});
		switch (event.type) {
			case "email.sent":
				console.log("Email sent successfully");
				break;
			case "email.delivered":
				console.log("Email delivered");
				break;
			case "email.bounced":
				console.log("Email bounced");
				break;
			case "email.complained":
				console.log("Email marked as spam");
				break;
			default:
				console.log(`Email event: ${event.type}`);
		}
	},
});

/**
 * Handler for email.received events.
 * This processes incoming emails to your custom domain.
 */
export const handleReceivedEmail = internalMutation({
	args: {
		payload: v.any(),
	},
	handler: async (_ctx, { payload }) => {
		console.log("📧 Received email:", {
			type: payload.type,
			from: payload.data.from,
			to: payload.data.to,
			subject: payload.data.subject,
			createdAt: payload.created_at,
		});
	},
});
