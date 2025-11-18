import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;

if (!CONVEX_SITE_URL) {
	throw new Error("VITE_CONVEX_SITE_URL environment variable is required");
}

async function proxyToConvex(request: Request) {
	const url = new URL(request.url);
	const pathname = url.pathname.replace(/^\/api\/auth/, "");
	const convexUrl = `${CONVEX_SITE_URL}/api/auth${pathname}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete("host");

	const response = await fetch(convexUrl, {
		method: request.method,
		headers,
		body: request.body,
	});

	const responseHeaders = new Headers(response.headers);
	responseHeaders.delete("content-encoding");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

export async function loader({ request }: LoaderFunctionArgs) {
	return proxyToConvex(request);
}

export async function action({ request }: ActionFunctionArgs) {
	return proxyToConvex(request);
}
