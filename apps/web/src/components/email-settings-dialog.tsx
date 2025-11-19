"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import type { Id } from "@socialmedia/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

export function EmailSettingsDialog({
	open,
	onOpenChange,
	organizationId,
}: EmailSettingsDialogProps) {
	const recipients = useQuery(api.queries.organizations.getEmailRecipients, {
		organizationId: organizationId as Id<"organizations">,
	});
	const addRecipient = useMutation(
		api.mutations.organizations.addEmailRecipient,
	);
	const removeRecipient = useMutation(
		api.mutations.organizations.removeEmailRecipient,
	);

	const [email, setEmail] = React.useState("");
	const [isAdding, setIsAdding] = React.useState(false);
	const [removingEmails, setRemovingEmails] = React.useState<Set<string>>(
		new Set(),
	);

	const handleAddEmail = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			toast.error("Please enter a valid email address");
			return;
		}

		// Check for duplicates
		const normalizedEmail = email.toLowerCase().trim();
		if (recipients?.some((r) => r.email === normalizedEmail)) {
			toast.error("This email address is already in the list");
			return;
		}

		setIsAdding(true);
		try {
			await addRecipient({
				organizationId: organizationId as Id<"organizations">,
				email: email.trim(),
			});
			toast.success("Email address added successfully");
			setEmail("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add email address",
			);
		} finally {
			setIsAdding(false);
		}
	};

	const handleRemoveEmail = async (emailToRemove: string) => {
		setRemovingEmails((prev) => new Set(prev).add(emailToRemove));
		try {
			await removeRecipient({
				organizationId: organizationId as Id<"organizations">,
				email: emailToRemove,
			});
			toast.success("Email address removed successfully");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to remove email address",
			);
		} finally {
			setRemovingEmails((prev) => {
				const next = new Set(prev);
				next.delete(emailToRemove);
				return next;
			});
		}
	};

	const isLoading = recipients === undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="bg-background"
				style={{ backgroundColor: "var(--background)" }}
			>
				<DialogHeader>
					<DialogTitle>Email Settings</DialogTitle>
					<DialogDescription>
						Manage email addresses that will receive daily post digests. Emails
						are sent 1 hour after automatic post generation completes.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<form onSubmit={handleAddEmail} className="space-y-2">
						<Label htmlFor="email-input">Add Email Address</Label>
						<div className="flex gap-2">
							<Input
								id="email-input"
								type="email"
								placeholder="email@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isLoading || isAdding}
								required
							/>
							<Button
								type="submit"
								disabled={isLoading || isAdding || !email.trim()}
							>
								{isAdding ? "Adding..." : "Add"}
							</Button>
						</div>
					</form>

					<div className="space-y-2">
						<Label>Email Recipients</Label>
						{isLoading ? (
							<p className="text-muted-foreground text-sm">Loading...</p>
						) : recipients && recipients.length > 0 ? (
							<div className="space-y-2">
								{recipients.map((recipient) => (
									<div
										key={recipient._id}
										className="flex items-center justify-between rounded-md border p-2"
									>
										<span className="text-sm">{recipient.email}</span>
										<Button
											type="button"
											variant="noShadow"
											size="sm"
											onClick={() => handleRemoveEmail(recipient.email)}
											disabled={removingEmails.has(recipient.email)}
											className="h-8 w-8 p-0"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								No email recipients configured. Add an email address to receive
								daily post digests.
							</p>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="neutral"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
