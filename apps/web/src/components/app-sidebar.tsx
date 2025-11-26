"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import type { Id } from "@socialmedia/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { Bot, Mail, SquarePen } from "lucide-react";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { OrganizationMenu } from "@/components/organization-menu";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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
import { UserProfileMenu } from "@/components/user-profile-menu";
import { useEmailSelectionStore } from "@/stores/email-selection-store";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { isMobile } = useSidebar();
	const location = useLocation();
	const navigate = useNavigate();
	const emails = useQuery(api.queries.emails.getEmailsWithParsedContent);
	const generatePost = useAction(api.actions.posts.generatePost);
	const { selectedEmailIds, getSelectedCount, clearSelection } =
		useEmailSelectionStore();
	const [isGenerating, setIsGenerating] = React.useState(false);

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

	const handleGeneratePost = async () => {
		if (!emails || selectedEmailIds.size === 0) {
			return;
		}

		setIsGenerating(true);
		try {
			// Get selected emails
			const selectedEmails = emails.filter((email) =>
				selectedEmailIds.has(email._id),
			);

			// Collect all images from selected emails
			const allImages: Array<{
				imageUrl: string;
				emailId: Id<"emails">;
				subject?: string;
				sender: string;
				textContent?: string;
			}> = [];

			for (const email of selectedEmails) {
				const imageUrls = email.parsedContent?.imageUrls || [];
				for (const imageUrl of imageUrls) {
					allImages.push({
						imageUrl,
						emailId: email._id as Id<"emails">,
						subject: email.subject,
						sender: email.sender,
						textContent:
							email.parsedContent?.textContent || email.rawText || "",
					});
				}
			}

			if (allImages.length === 0) {
				toast.error("No images found in selected emails");
				return;
			}

			// Limit to 5 images
			const imagesToUse = allImages.slice(0, 5);
			if (allImages.length > 5) {
				toast.warning("Maximum 5 images allowed. Using first 5 images.");
			}

			// Call generatePost action - generates one post per image
			const generatedPosts = await generatePost({
				selectedImages: imagesToUse,
			});

			const postCount = generatedPosts?.length ?? imagesToUse.length;
			toast.success(
				postCount === 1
					? "1 post generated successfully!"
					: `${postCount} posts generated successfully!`,
			);
			clearSelection();
			navigate("/posts");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to generate post";
			toast.error(errorMessage);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<Sidebar
			collapsible="none"
			className="h-svh border-r-2 border-r-black"
			{...props}
		>
			<SidebarHeader>
				<SidebarMenu>
					<OrganizationMenu />
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
						{getSelectedCount() >= 1 && (
							<SidebarMenuItem>
								<SidebarMenuButton
									tooltip="Generate Post"
									className="border-green-600 bg-green-500 text-center text-base text-white hover:bg-green-600 [&>svg]:size-6"
									onClick={handleGeneratePost}
									disabled={isGenerating}
								>
									<Bot />
									<span>
										{isGenerating ? "Generating..." : "Generate Post"}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<UserProfileMenu />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
