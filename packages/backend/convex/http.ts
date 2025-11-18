import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { resend } from "./handlers/event";
import { verifyResendWebhook } from "./lib/webhook";

const http = httpRouter();

// Handles outbound email events (sent, delivered, bounced, etc.)
http.route({
	path: "/api/email/webhook",
	method: "POST",
	handler: httpAction(async (ctx, req) => {
		return await resend.handleResendEventWebhook(ctx, req);
	}),
});

// Handles inbound email.received events
http.route({
	path: "/api/email/received",
	method: "POST",
	handler: httpAction(async (ctx, req) => {
		const payload = (await verifyResendWebhook(req)) as {
			type: string;
			data: {
				email_id: string;
				to: string | string[];
				from?: string;
				subject?: string;
			};
			created_at: number;
		};

		// Only process email.received events
		if (payload.type !== "email.received") {
			return new Response(JSON.stringify({ success: true, ignored: true }), {
				status: 200,
			});
		}

		const emailId = payload.data.email_id;
		// Handle both string and array formats for 'to' field
		const recipientEmail = Array.isArray(payload.data.to)
			? payload.data.to[0]?.toLowerCase().trim()
			: payload.data.to?.toLowerCase().trim();

		if (!recipientEmail) {
			throw new Error("No recipient email found in payload");
		}

		// Find organization by recipient email
		const organization = await ctx.runQuery(
			api.queries.organizations.getOrganizationByRecipientEmail,
			{
				recipientEmail,
			},
		);

		if (!organization) {
			console.error(
				`No organization found for recipient email: ${recipientEmail}`,
			);
			throw new Error(`No organization found for email: ${recipientEmail}`);
		}

		// Fetch full email content and process attachments (uploads to Convex Storage)
		const emailContent = await ctx.runAction(
			internal.actions.emailContent.fetchAndProcessEmailAttachments,
			{
				emailId,
				organizationId: organization._id,
			},
		);

		const recipientString =
			Array.isArray(emailContent.to) && emailContent.to.length > 0
				? emailContent.to[0]
				: recipientEmail;

		await ctx.runMutation(internal.mutations.events.insertEmailFromWebhook, {
			sender: emailContent.from,
			recipient: recipientString,
			subject: emailContent.subject ?? undefined,
			rawText: emailContent.text ?? undefined,
			textContent: emailContent.text ?? undefined,
			imageUrls: emailContent.imageUrls,
			organizationId: organization._id,
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	}),
});

export default http;
