import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
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
		const payload = await verifyResendWebhook(req);

		await ctx.runMutation(internal.mutations.events.handleReceivedEmail, {
			payload,
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	}),
});

export default http;
