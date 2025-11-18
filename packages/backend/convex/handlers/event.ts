"use node";

import { Resend } from "@convex-dev/resend";
import { components, internal } from "../_generated/api";

export const resend: Resend = new Resend(components.resend, {
	onEmailEvent: internal.mutations.events.handleEmailEvent,
	testMode: false,
});
