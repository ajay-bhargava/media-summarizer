import { Navigate } from "react-router";
import { AuthenticatedLayout } from "../components/authenticated-layout";
import { useSession } from "../lib/auth-client";
import type { Route } from "./+types/_authenticated";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "PS15 Social Media System" },
		{
			name: "description",
			content: "PS15 Social Media System",
		},
	];
}

export default function AuthenticatedRoute() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!session) {
		return <Navigate to="/" replace />;
	}

	return <AuthenticatedLayout />;
}
