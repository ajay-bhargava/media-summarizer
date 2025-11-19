import { api } from "@socialmedia/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
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
	const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(
		new Set(),
	);

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

	const toggleEmailSelection = (emailId: string) => {
		setSelectedEmailIds((prev) => {
			const next = new Set(prev);
			if (next.has(emailId)) {
				next.delete(emailId);
			} else {
				next.add(emailId);
			}
			return next;
		});
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden">
			{groupedEmails.map((group) => (
				<div key={group.label} className="flex flex-col gap-4">
					<h2 className="font-heading text-xl">{group.label}</h2>
					<div className="flex w-full flex-col items-center gap-4">
						{group.emails.map((email) => {
							const imageUrls = email.parsedContent?.imageUrls || [];
							const textContent =
								email.parsedContent?.textContent || email.rawText || "";
							const isSelected = selectedEmailIds.has(email._id);

							return (
								<Card
									key={email._id}
									className={`relative flex aspect-[4/3] w-full max-w-3xl flex-col overflow-hidden transition-all ${
										isSelected
											? "ring-2 ring-black ring-offset-2"
											: "hover:opacity-90"
									}`}
								>
									{imageUrls.length > 0 && (
										<div className="relative h-[66.666%] w-full overflow-hidden">
											<Carousel className="h-full w-full">
												<CarouselContent className="h-full">
													{imageUrls.map((imageUrl, index) => (
														<CarouselItem key={imageUrl} className="h-full">
															<img
																src={imageUrl}
																alt={`${index + 1} from ${email.sender}`}
																className="h-full w-full object-cover"
															/>
														</CarouselItem>
													))}
												</CarouselContent>
												{imageUrls.length > 1 && (
													<>
														<CarouselPrevious className="left-2" />
														<CarouselNext className="right-2" />
													</>
												)}
											</Carousel>
											<button
												type="button"
												className="absolute top-2 right-2 z-10"
												onClick={(e) => {
													e.stopPropagation();
													toggleEmailSelection(email._id);
												}}
											>
												<Checkbox checked={isSelected} />
											</button>
										</div>
									)}
									<CardContent className="flex-1 p-4">
										<div className="space-y-2">
											<div className="text-sm">
												<span className="font-semibold">From:</span>{" "}
												<span className="text-muted-foreground">
													{email.sender}
												</span>
											</div>
											<div className="text-sm">
												<span className="font-semibold">Subject:</span>{" "}
												<span className="text-muted-foreground">
													{email.subject || "No subject"}
												</span>
											</div>
											{textContent && (
												<div className="line-clamp-3 font-normal text-muted-foreground text-sm">
													{textContent}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
