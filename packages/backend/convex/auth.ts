import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

if (!process.env.CONVEX_SITE_URL || !process.env.BETTER_AUTH_APPLICATION_ID) {
	throw new Error("CONVEX_SITE_URL and BETTER_AUTH_APPLICATION_ID must be set");
}

const siteUrl = process.env.CONVEX_SITE_URL;

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
		plugins: [crossDomain({ siteUrl }), convex()],
	});
};
