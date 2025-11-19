"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ChevronsUpDown, Plus } from "lucide-react";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

export function OrganizationMenu() {
	const { isMobile } = useSidebar();
	const userProfile = useQuery(api.queries.userProfiles.getCurrentUserProfile);
	const joinOrganization = useMutation(
		api.mutations.organizations.joinOrganization,
	);

	const [joinDialogOpen, setJoinDialogOpen] = React.useState(false);
	const [recipientEmail, setRecipientEmail] = React.useState("");
	const [isJoining, setIsJoining] = React.useState(false);

	const handleJoinOrganization = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!recipientEmail.trim()) {
			toast.error("Please enter an organization email");
			return;
		}

		setIsJoining(true);
		try {
			await joinOrganization({ recipientEmail: recipientEmail.trim() });
			toast.success("Successfully joined organization!");
			setJoinDialogOpen(false);
			setRecipientEmail("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to join organization",
			);
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<SidebarMenuItem>
			{userProfile?.organization ? (
				<DropdownMenu>
					<DropdownMenuTrigger className="focus-visible:ring-0" asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-main data-[state=open]:text-main-foreground data-[state=open]:outline-2 data-[state=open]:outline-border"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-base bg-main text-main-foreground">
								{userProfile.organization.name[0].toUpperCase()}
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-heading">
									{userProfile.organization.name}
								</span>
								<span className="truncate text-xs capitalize">
									{userProfile.role}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-base border-2 border-border bg-background"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="font-heading text-sm">
							Organization
						</DropdownMenuLabel>
						<DropdownMenuItem className="gap-2 p-1.5" disabled>
							<div className="flex size-6 items-center justify-center">
								<div className="flex size-4 items-center justify-center rounded-base bg-main text-main-foreground text-xs">
									{userProfile.organization.name[0].toUpperCase()}
								</div>
							</div>
							{userProfile.organization.name}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<Dialog
							open={joinDialogOpen}
							onOpenChange={setJoinDialogOpen}
						>
							<DialogTrigger asChild>
								<DropdownMenuItem
									className="gap-2 p-1.5"
									onSelect={(e) => {
										e.preventDefault();
										setJoinDialogOpen(true);
									}}
								>
									<div className="flex size-6 items-center justify-center">
										<Plus className="size-4" />
									</div>
									<div className="font-base">Join Organization</div>
								</DropdownMenuItem>
							</DialogTrigger>
							<DialogContent
								className="bg-background"
								style={{ backgroundColor: "var(--background)" }}
							>
								<DialogHeader>
									<DialogTitle>Join Organization</DialogTitle>
									<DialogDescription>
										Enter the organization's forwarding email address to join.
									</DialogDescription>
								</DialogHeader>
								<form onSubmit={handleJoinOrganization}>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label htmlFor="recipientEmail">
												Organization Email
											</Label>
											<Input
												id="recipientEmail"
												type="email"
												placeholder="org@example.com"
												value={recipientEmail}
												onChange={(e) =>
													setRecipientEmail(e.target.value)
												}
												required
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											type="button"
											variant="neutral"
											onClick={() => setJoinDialogOpen(false)}
										>
											Cancel
										</Button>
										<Button type="submit" disabled={isJoining}>
											{isJoining ? "Joining..." : "Join"}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
					<DialogTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-main data-[state=open]:text-main-foreground data-[state=open]:outline-2 data-[state=open]:outline-border"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-base bg-main text-main-foreground">
								<Plus className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-heading">
									Join Organization
								</span>
								<span className="truncate text-xs">
									Click to join an organization
								</span>
							</div>
						</SidebarMenuButton>
					</DialogTrigger>
					<DialogContent
						className="bg-background"
						style={{ backgroundColor: "var(--background)" }}
					>
						<DialogHeader>
							<DialogTitle>Join Organization</DialogTitle>
							<DialogDescription>
								Enter the organization's forwarding email address to join.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleJoinOrganization}>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="recipientEmail">
										Organization Email
									</Label>
									<Input
										id="recipientEmail"
										type="email"
										placeholder="org@example.com"
										value={recipientEmail}
										onChange={(e) => setRecipientEmail(e.target.value)}
										required
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="neutral"
									onClick={() => setJoinDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isJoining}>
									{isJoining ? "Joining..." : "Join"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}
		</SidebarMenuItem>
	);
}

