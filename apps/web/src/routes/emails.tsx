import { api } from "@socialmedia/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { EmailCard } from "@/components/email-card";
import type { Route } from "./+types/emails";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Emails - PS15 Social Media System" },
		{ name: "description", content: "Manage your email campaigns" },
	];
}

type EmailWithContent = {
	_id: string;
	sender: string;
	subject?: string;
	receivedAt: number;
	rawText?: string;
	parsedContent?: {
		imageUrls?: string[];
		textContent?: string;
	} | null;
};

type GroupedEmails = {
	label: string;
	emails: EmailWithContent[];
};

function groupEmailsByDate(emails: EmailWithContent[]): GroupedEmails[] {
	const todayStart = new Date().setHours(0, 0, 0, 0);
	const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
	const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

	const groups: Record<string, EmailWithContent[]> = {
		Today: [],
		Yesterday: [],
		"This Week": [],
		Older: [],
	};

	emails.forEach((email) => {
		const receivedAt = email.receivedAt;
		if (receivedAt >= todayStart) {
			groups.Today.push(email);
		} else if (receivedAt >= yesterdayStart) {
			groups.Yesterday.push(email);
		} else if (receivedAt >= weekStart) {
			groups["This Week"].push(email);
		} else {
			groups.Older.push(email);
		}
	});

	return Object.entries(groups)
		.filter(([, emails]) => emails.length > 0)
		.map(([label, emails]) => ({
			label,
			emails: emails.sort((a, b) => b.receivedAt - a.receivedAt),
		}));
}

export default function Emails() {
	const emails = useQuery(api.queries.emails.getEmailsWithParsedContent);

	if (emails === undefined) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<p className="text-muted-foreground">Loading emails...</p>
			</div>
		);
	}

	// Filter emails to only include those with images
	const emailsWithImages = emails.filter(
		(email) =>
			email.parsedContent?.imageUrls &&
			email.parsedContent.imageUrls.length > 0,
	);

	// Group emails by date
	const groupedEmails = groupEmailsByDate(emailsWithImages);

	if (groupedEmails.length === 0) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<p className="text-muted-foreground">No emails with images found.</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden">
			{groupedEmails.map((group) => (
				<div key={group.label} className="flex flex-col gap-4">
					<h2 className="font-heading text-xl">{group.label}</h2>
					<div className="flex w-full flex-col items-center gap-4">
						{group.emails.map((email) => (
							<EmailCard key={email._id} email={email} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
