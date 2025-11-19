"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import * as React from "react";
import { CronSettingsDialog } from "@/components/cron-settings-dialog";
import { EmailSettingsDialog } from "@/components/email-settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";

export function UserProfileMenu() {
	const { isMobile } = useSidebar();
	const { data: session } = useSession();
	const userProfile = useQuery(api.queries.userProfiles.getCurrentUserProfile);
	const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
	const [emailSettingsDialogOpen, setEmailSettingsDialogOpen] =
		React.useState(false);

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
							<span className="truncate text-xs">{session?.user?.email}</span>
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
								<span className="truncate text-xs">{session?.user?.email}</span>
							</div>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						{userProfile?.organizationId && (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Settings />
									Settings
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="rounded-base border-2 border-border bg-background">
									<DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
										Post Generation Settings
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setEmailSettingsDialogOpen(true)}
									>
										Email Settings
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						)}
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			{userProfile?.organizationId && (
				<>
					<CronSettingsDialog
						open={settingsDialogOpen}
						onOpenChange={setSettingsDialogOpen}
						organizationId={userProfile.organizationId}
					/>
					<EmailSettingsDialog
						open={emailSettingsDialogOpen}
						onOpenChange={setEmailSettingsDialogOpen}
						organizationId={userProfile.organizationId}
					/>
				</>
			)}
		</SidebarMenuItem>
	);
}
