import {
	convexClient,
	crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_CONVEX_SITE_URL;

if (!baseURL) {
	throw new Error(
		"VITE_CONVEX_SITE_URL is required. Add it to apps/web/.env.local",
	);
}

export const authClient = createAuthClient({
	baseURL,
	plugins: [convexClient(), crossDomainClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
