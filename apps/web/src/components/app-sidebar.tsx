"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ChevronsUpDown, LogOut, Mail, Plus, SquarePen } from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isMobile } = useSidebar();
	const { data: session } = useSession();
	const location = useLocation();
	const userProfile = useQuery(api.queries.userProfiles.getCurrentUserProfile);
	const joinOrganization = useMutation(
		api.mutations.organizations.joinOrganization,
	);

	// Get current page name from pathname
	const getPageName = (pathname: string) => {
		if (pathname === "/") return "Dashboard";
		const segments = pathname.split("/").filter(Boolean);
		if (segments.length === 0) return "Dashboard";
		return segments[segments.length - 1]
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

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

	const handleSignOut = async () => {
		await signOut();
	};

	const userInitials =
		session?.user?.name
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) ||
		session?.user?.email?.[0].toUpperCase() ||
		"U";

	return (
		<Sidebar
			collapsible="none"
			className="h-svh border-r-2 border-r-black"
			{...props}
		>
			<SidebarHeader>
				<SidebarMenu>
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
													Enter the organization's forwarding email address to
													join.
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
				</SidebarMenu>
				{isMobile && (
					<div className="px-2 py-2">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>
										{getPageName(location.pathname)}
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				)}
			</SidebarHeader>
			<SidebarContent className="flex-1">
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								tooltip="Posts"
								className="text-center text-base [&>svg]:size-6"
							>
								<Link to="/posts">
									<SquarePen />
									<span>Posts</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								tooltip="Emails"
								className="text-center text-base [&>svg]:size-6"
							>
								<Link to="/emails">
									<Mail />
									<span>Emails</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									className="overflow-visible group-data-[state=collapsed]:hover:bg-transparent group-data-[state=collapsed]:hover:outline-0"
									size="lg"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={session?.user?.image || ""}
											alt={session?.user?.name || "User"}
										/>
										<AvatarFallback>{userInitials}</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-heading">
											{session?.user?.name || "User"}
										</span>
										<span className="truncate text-xs">
											{session?.user?.email}
										</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-base border-2 border-border bg-background"
								side={isMobile ? "bottom" : "right"}
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-base">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={session?.user?.image || ""}
												alt={session?.user?.name || "User"}
											/>
											<AvatarFallback>{userInitials}</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-heading">
												{session?.user?.name || "User"}
											</span>
											<span className="truncate text-xs">
												{session?.user?.email}
											</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={handleSignOut}>
										<LogOut />
										Log out
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
