import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./index.css";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { AuthenticatedLayout } from "./components/authenticated-layout";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { authClient, useSession } from "./lib/auth-client";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function AppContent() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (session) {
		return <AuthenticatedLayout />;
	}

	return <Outlet />;
}

export default function App() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

	if (!convexUrl || convexUrl.length === 0) {
		throw new Error(
			"VITE_CONVEX_URL environment variable is not set or is empty. Add it to apps/web/.env.local and restart the dev server.",
		);
	}

	const convex = new ConvexReactClient(convexUrl);

	return (
		<ConvexBetterAuthProvider client={convex} authClient={authClient}>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<AppContent />
				<Toaster richColors />
			</ThemeProvider>
		</ConvexBetterAuthProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;
	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}
	return (
		<main className="container mx-auto p-4 pt-16">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full overflow-x-auto p-4">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
