import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

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
			requireEmailVerification: false,
		},
		middleware: [
			async (input: {
				path: string;
				method: string;
				body?: unknown;
				[key: string]: unknown;
			}) => {
				// Check if this is a signup request (email and password signup)
				// Only restrict signups, not sign-ins
				const isSignUpPath =
					(input.path.includes("/sign-up") || input.path.includes("/signup")) &&
					!input.path.includes("/sign-in") &&
					!input.path.includes("/signin");
				if (isSignUpPath && input.method === "POST" && input.body) {
					const body = input.body as { email?: string };
					if (body.email && !isValidEmailDomain(body.email)) {
						throw new Error(
							`Signups are restricted to email addresses from the following domains: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
						);
					}
				}
				return input;
			},
		],
		plugins: [
			// The cross domain plugin is required for client side frameworks
			// It handles redirects between the local app and Convex site
			crossDomain({ siteUrl }),
			// The Convex plugin is required for Convex compatibility
			convex(),
		],
	});
};
