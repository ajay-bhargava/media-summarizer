import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	organizations: defineTable({
		name: v.string(),
		recipientEmail: v.string(),
		createdAt: v.number(),
		cronSchedule: v.optional(v.string()),
		cronEnabled: v.optional(v.boolean()),
		cronJobId: v.optional(v.string()),
	}).index("by_recipient_email", ["recipientEmail"]),

	emails: defineTable({
		sender: v.string(),
		recipient: v.string(),
		subject: v.optional(v.string()),
		receivedAt: v.number(),
		rawText: v.optional(v.string()),
		organizationId: v.id("organizations"),
	})
		.index("by_organization", ["organizationId"])
		.index("by_received_at", ["receivedAt"]),

	parsedEmailContent: defineTable({
		emailId: v.id("emails"),
		textContent: v.optional(v.string()),
		imageUrls: v.optional(v.array(v.string())),
		processed: v.boolean(),
	}).index("by_email", ["emailId"]),

	aiGeneratedPosts: defineTable({
		captionText: v.string(),
		imageUrl: v.optional(v.string()),
		imageStorageId: v.optional(v.id("_storage")),
		createdAt: v.number(),
		organizationId: v.optional(v.id("organizations")),
		emailId: v.optional(v.id("emails")),
		sourceImageUrl: v.optional(v.string()),
		suggestedImage: v.optional(v.string()),
		isUserGenerated: v.boolean(),
		sourceImageUrls: v.optional(v.array(v.string())),
	})
		.index("by_organization", ["organizationId"])
		.index("by_email", ["emailId"])
		.index("by_user_generated", ["isUserGenerated"])
		.index("by_created_at", ["createdAt"]),

	userProfiles: defineTable({
		userId: v.string(),
		organizationId: v.id("organizations"),
		role: v.string(),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_organization", ["organizationId"]),
});
