import type { Route } from "./+types/emails";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Emails - PS15 Social Media System" },
		{ name: "description", content: "Manage your email campaigns" },
	];
}

export default function Emails() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
			</div>
			<p>Emails</p>
			<div className="min-h-screen flex-1 rounded-xl bg-muted/50" />
		</div>
	);
}
