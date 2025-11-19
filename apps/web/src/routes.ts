import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/_index.tsx"),
	layout("routes/_authenticated.tsx", [
		route("posts", "routes/posts.tsx"),
		route("emails", "routes/emails.tsx"),
	]),
] satisfies RouteConfig;
