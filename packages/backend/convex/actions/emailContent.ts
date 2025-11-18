"use node";

import { v } from "convex/values";
import {
	type ErrorResponse,
	type GetReceivingEmailResponseSuccess,
	type ListAttachmentsResponseSuccess,
	Resend,
} from "resend";
import { action } from "../_generated/server";

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
		}: {
			data: ListAttachmentsResponseSuccess | null;
			error: ErrorResponse | null | undefined;
		} = await resend.emails.attachments.list({ emailId: args.emailId });

		if (attachmentsError) {
			throw new Error(
				`Failed to fetch attachments: ${attachmentsError.message}`,
			);
		}

		return email;
	},
});
