"use node";

import {
	Body,
	Button,
	Heading,
	Html,
	Img,
	Link,
	Section,
	Text,
} from "@react-email/components";
import { pretty, render } from "@react-email/render";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { resend } from "./handlers/event";

interface Post {
	_id: string;
	captionText: string;
	imageUrl?: string;
	sourceImageUrl?: string;
}

interface EmailTemplateProps {
	posts: Post[];
	siteUrl: string;
}

function EmailTemplate({ posts, siteUrl }: EmailTemplateProps) {
	return (
		<Html>
			<Body style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
				{/* Heading */}
				<Heading
					style={{
						fontSize: "24px",
						fontWeight: "600",
						marginBottom: "24px",
						color: "#111827",
					}}
				>
					Hello, here are the posts that've been generated today.
				</Heading>

				{/* Posts */}
				{posts.map((post, index) => {
					const imageUrl = post.imageUrl || post.sourceImageUrl || "";
					const description =
						post.captionText.length > 150
							? `${post.captionText.substring(0, 150)}...`
							: post.captionText;

					return (
						<Section
							key={post._id || index}
							style={{
								marginBottom: "32px",
								padding: "24px",
								backgroundColor: "#ffffff",
								border: "1px solid #e5e7eb",
								borderRadius: "8px",
								boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
							}}
						>
							<Heading
								style={{
									fontSize: "20px",
									fontWeight: "600",
									marginTop: "0",
									marginBottom: "16px",
									color: "#111827",
								}}
							>
								Post {index + 1}
							</Heading>
							<table style={{ width: "100%" }}>
								<tbody>
									<tr>
										<td
											style={{
												width: "50%",
												paddingRight: "24px",
												verticalAlign: "top",
											}}
										>
											{imageUrl && (
												<Img
													alt="Post Image"
													style={{
														width: "100%",
														borderRadius: "8px",
														objectFit: "cover",
													}}
													height={220}
													src={imageUrl}
												/>
											)}
										</td>
										<td
											style={{
												width: "50%",
												verticalAlign: "top",
												paddingLeft: "24px",
											}}
										>
											<Text
												style={{
													margin: "0 0 12px 0",
													fontSize: "16px",
													lineHeight: "24px",
													color: "#6b7280",
												}}
											>
												{description}
											</Text>
											<Button
												style={{
													width: "75%",
													borderRadius: "8px",
													backgroundColor: "#4f46e5",
													padding: "12px 16px",
													textAlign: "center",
													fontWeight: "600",
													color: "#ffffff",
													textDecoration: "none",
													display: "inline-block",
												}}
												href={siteUrl}
											>
												View Post
											</Button>
										</td>
									</tr>
								</tbody>
							</table>
						</Section>
					);
				})}

				{/* Footer */}
				<Section
					style={{
						marginTop: "40px",
						paddingTop: "24px",
						borderTop: "1px solid #e5e7eb",
						textAlign: "center",
					}}
				>
					<Text
						style={{
							margin: "0",
							fontSize: "14px",
							lineHeight: "20px",
							color: "#6b7280",
						}}
					>
						Lovingly crafted by{" "}
						<Link
							href="https://ajay-bhargava.github.io"
							style={{
								color: "#4f46e5",
								textDecoration: "underline",
							}}
						>
							Ajay Bhargava Ph.D.
						</Link>{" "}
						and the Fractal Tech NYC community
					</Text>
				</Section>
			</Body>
		</Html>
	);
}

export const sendDailyPostDigest = internalAction({
	args: {
		organizationId: v.id("organizations"),
		startDate: v.number(),
		endDate: v.number(),
		includeUserGenerated: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		message?: string;
		recipientsCount?: number;
		postsCount?: number;
	}> => {
		const includeUserGenerated = args.includeUserGenerated ?? false;

		// Get posts for the date range
		const posts = await ctx.runQuery(api.queries.posts.getPostsForDateRange, {
			organizationId: args.organizationId,
			startDate: args.startDate,
			endDate: args.endDate,
			includeUserGenerated,
		});

		// Don't send email if no posts
		if (posts.length === 0) {
			console.log(
				`[Email] No posts found for organization ${args.organizationId} in date range, skipping email`,
			);
			return { success: false, message: "No posts to send" };
		}

		// Get email recipients
		const recipients: Array<{
			_id: string;
			email: string;
			organizationId: string;
			createdAt: number;
		}> = await ctx.runQuery(api.queries.organizations.getEmailRecipients, {
			organizationId: args.organizationId,
		});

		if (recipients.length === 0) {
			console.log(
				`[Email] No email recipients found for organization ${args.organizationId}, skipping email`,
			);
			return { success: false, message: "No email recipients configured" };
		}

		// Get organization for from address
		const organization = await ctx.runQuery(
			api.queries.organizations.getOrganizationById,
			{
				orgId: args.organizationId,
			},
		);

		if (!organization) {
			throw new Error("Organization not found");
		}

		// Get site URL from environment
		const siteUrl = process.env.SITE_URL || "https://example.com";

		// Render React Email template
		const html = await pretty(
			await render(<EmailTemplate posts={posts} siteUrl={siteUrl} />),
		);

		// Send email to all recipients
		const recipientEmails: string[] = recipients.map((r) => r.email);
		const fromEmail = organization.recipientEmail || "noreply@example.com";

		// Use Resend component to send email to each recipient
		// Resend component's sendEmail accepts string for 'to', so we send individually
		await Promise.all(
			recipientEmails.map((email) =>
				resend.sendEmail(ctx, {
					from: `${organization.name} <${fromEmail}>`,
					to: email,
					subject: `Daily Post Digest - ${new Date(args.startDate).toLocaleDateString()}`,
					html,
				}),
			),
		);

		console.log(
			`[Email] Successfully sent daily digest to ${recipientEmails.length} recipient(s) for organization ${args.organizationId}`,
		);

		return {
			success: true,
			recipientsCount: recipientEmails.length,
			postsCount: posts.length,
		};
	},
});

// Manual trigger action (includes both user and cron-generated posts)
// When called from dashboard, organizationId is required.
// When called from frontend with authenticated user, organizationId is optional.
export const sendManualDailyDigest = action({
	args: {
		organizationId: v.optional(v.id("organizations")),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		message?: string;
		recipientsCount?: number;
		postsCount?: number;
	}> => {
		let organizationId: Id<"organizations"> | undefined = args.organizationId;

		// If organizationId not provided, try to get from authenticated user profile
		if (!organizationId) {
			const profile: { organizationId: Id<"organizations"> } | null =
				await ctx.runQuery(api.queries.userProfiles.getCurrentUserProfile);

			if (!profile || !profile.organizationId) {
				throw new Error(
					"Organization ID is required when called from dashboard, or user must be authenticated and belong to an organization",
				);
			}

			organizationId = profile.organizationId;
		}

		// Calculate date range (defaults to today)
		const now = Date.now();
		const offset = Number.parseInt(process.env.TIMEZONE_OFFSET || "-5", 10);
		const utcNow = new Date(now + offset * 60 * 60 * 1000);
		const start = args.startDate ? new Date(args.startDate) : new Date(utcNow);
		start.setUTCHours(0, 0, 0, 0);
		start.setTime(start.getTime() - offset * 60 * 60 * 1000);
		const end = args.endDate ? new Date(args.endDate) : new Date(utcNow);
		end.setUTCHours(23, 59, 59, 999);
		end.setTime(end.getTime() - offset * 60 * 60 * 1000);

		// Call internal action with includeUserGenerated: true
		if (!organizationId) {
			throw new Error("Organization ID is required");
		}
		return await ctx.runAction(internal.emails.sendDailyPostDigest, {
			organizationId,
			startDate: start.getTime(),
			endDate: end.getTime(),
			includeUserGenerated: true,
		});
	},
});
