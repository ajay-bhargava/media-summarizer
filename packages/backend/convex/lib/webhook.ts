"use node";

import { Webhook } from "svix";

/**
 * Verifies a Resend webhook request and returns the verified payload.
 * @param req The incoming HTTP request
 * @returns The verified webhook payload
 * @throws Error if webhook secret is not configured or signature is invalid
 */
export async function verifyResendWebhook(req: Request): Promise<unknown> {
	const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
	if (!webhookSecret) {
		throw new Error("Webhook secret not configured");
	}

	const svix_id = req.headers.get("svix-id");
	const svix_timestamp = req.headers.get("svix-timestamp");
	const svix_signature = req.headers.get("svix-signature");

	if (!svix_id || !svix_timestamp || !svix_signature) {
		throw new Error("Missing required webhook headers");
	}

	const webhook = new Webhook(webhookSecret);
	const raw = await req.text();

	try {
		const payload = webhook.verify(raw, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		});
		return payload;
	} catch {
		throw new Error("Invalid webhook signature");
	}
}
