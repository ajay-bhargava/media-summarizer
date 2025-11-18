import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

if (!process.env.BETTER_AUTH_APPLICATION_ID) {
	throw new Error("BETTER_AUTH_APPLICATION_ID must be set");
}

if (!process.env.CONVEX_SITE_URL) {
	throw new Error("CONVEX_SITE_URL must be set");
}

const siteUrl = process.env.CONVEX_SITE_URL;

export const authComponent = createClient<DataModel>(components.betterAuth);
export const createAuth = (
	ctx: GenericCtx<DataModel>,
	{ optionsOnly } = { optionsOnly: false },
) => {
	const localOrigin = process.env.SITE_URL || "http://localhost:5173";

	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		trustedOrigins: [localOrigin, "http://localhost:5173"],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		plugins: [convex(), crossDomain({ siteUrl })],
	});
};
