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
		plugins: [
			// The cross domain plugin is required for client side frameworks
			// It handles redirects between the local app and Convex site
			crossDomain({ siteUrl }),
			// The Convex plugin is required for Convex compatibility
			convex(),
		],
	});
};
