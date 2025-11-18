"use node";

import { v } from "convex/values";
import {
	type ErrorResponse,
	type GetReceivingEmailResponseSuccess,
	type ListAttachmentsResponse,
	Resend,
} from "resend";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

export const fetchEmailContent = action({
	args: {
		emailId: v.string(),
	},
	handler: async (_ctx, args) => {
		if (!process.env.RESEND_API_KEY) {
			throw new Error("RESEND_API_KEY is not set");
		}
		const resend = new Resend(process.env.RESEND_API_KEY);

		// Fetch the email from Resend
		const {
			data: email,
			error: emailError,
		}: {
			data: GetReceivingEmailResponseSuccess | null;
			error: ErrorResponse | null | undefined;
		} = await resend.emails.receiving.get(args.emailId);

		if (emailError) {
			throw new Error(`Failed to fetch email: ${emailError.message}`);
		}

		// Fetch the attachments from Resend
		const {
			data: _attachments,
			error: attachmentsError,
		}: ListAttachmentsResponse = await resend.emails.receiving.attachments.list(
			{
				emailId: args.emailId,
			},
		);

		if (attachmentsError) {
			throw new Error(
				`Failed to fetch attachments: ${attachmentsError.message}`,
			);
		}

		return email;
	},
});

/**
 * Internal action that fetches email content and uploads image attachments to Convex Storage.
 * This is called from handleReceivedEmail mutation.
 */
export const fetchAndProcessEmailAttachments = internalAction({
	args: {
		emailId: v.string(),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		if (!process.env.RESEND_API_KEY) {
			throw new Error("RESEND_API_KEY is not set");
		}
		const resend = new Resend(process.env.RESEND_API_KEY);

		// Fetch the email from Resend
		const {
			data: email,
			error: emailError,
		}: {
			data: GetReceivingEmailResponseSuccess | null;
			error: ErrorResponse | null | undefined;
		} = await resend.emails.receiving.get(args.emailId);

		if (emailError || !email) {
			throw new Error(
				`Failed to fetch email: ${emailError?.message || "Email not found"}`,
			);
		}

		// Fetch the attachments from Resend
		const attachmentsResponse: ListAttachmentsResponse =
			await resend.emails.receiving.attachments.list({
				emailId: args.emailId,
			});

		if (attachmentsResponse.error) {
			console.error("Failed to fetch attachments:", attachmentsResponse.error);
		}

		// Process attachments - download images and upload to Convex Storage
		const imageUrls: string[] = [];
		const attachments = attachmentsResponse.data?.data || [];

		if (attachments.length > 0) {
			for (const attachment of attachments) {
				const isImage = attachment.content_type?.startsWith("image/") ?? false;

				if (isImage && attachment.download_url) {
					try {
						// Download the attachment from Resend
						const response = await fetch(attachment.download_url);
						if (!response.ok) {
							console.error(`Failed to download ${attachment.filename}`);
							continue;
						}

						// Convert to base64
						const arrayBuffer = await response.arrayBuffer();
						const buffer = Buffer.from(arrayBuffer);
						const base64Data = buffer.toString("base64");

						// Upload to Convex Storage using internal action
						const uploadResult = await ctx.runAction(
							internal.actions.storage.uploadImageInternal,
							{
								imageData: base64Data,
								contentType: attachment.content_type || "image/png",
								fileName: attachment.filename || "attachment",
								organizationId: args.organizationId,
							},
						);

						// Store the permanent Convex Storage URL
						imageUrls.push(uploadResult.url);
					} catch (error) {
						console.error(
							`Error processing attachment ${attachment.filename}:`,
							error,
						);
					}
				}
			}
		}

		return {
			html: email.html,
			text: email.text,
			from: email.from,
			to: email.to,
			subject: email.subject,
			createdAt: email.created_at,
			imageUrls,
		};
	},
});
