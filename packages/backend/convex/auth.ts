import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { resend } from "./handlers/event";

if (!process.env.SITE_URL) {
	throw new Error("SITE_URL must be set");
}

if (!process.env.CONVEX_SITE_URL) {
	throw new Error("CONVEX_SITE_URL must be set");
}

const siteUrl = process.env.SITE_URL;

// Allowed email domains for signups
const ALLOWED_EMAIL_DOMAINS = [
	"ps15m.org",
	"schools.nyc.gov",
	"with-context.co",
];

function isValidEmailDomain(email: string): boolean {
	const domain = email.toLowerCase().split("@")[1];
	return domain !== undefined && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export const authComponent = createClient<DataModel>(components.betterAuth);
export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
) => {
	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				await resend.sendEmail(ctx, {
					from: "My App <noreply@example.com>",
					to: user.email,
					subject: "Reset your password",
					html: `<a href="${url}">Reset your password</a>`,
				});
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				await resend.sendEmail(ctx, {
					from: "My App <noreply@example.com>",
					to: user.email,
					subject: "Verify your email address",
					html: `<a href="${url}">Verify your email</a>`,
				});
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/sign-up/email") {
					const { email } = ctx.body;
					if (email && !isValidEmailDomain(email)) {
						throw new APIError("BAD_REQUEST", {
							message: `Signups are restricted to email addresses from the following domains: ${ALLOWED_EMAIL_DOMAINS.join(
								", ",
							)}`,
						});
					}
				}
			}),
		},
		plugins: [
			// The cross domain plugin is required for client side frameworks
			// It handles redirects between the local app and Convex site
			crossDomain({ siteUrl }),
			// The Convex plugin is required for Convex compatibility
			convex(),
		],
	});
};
