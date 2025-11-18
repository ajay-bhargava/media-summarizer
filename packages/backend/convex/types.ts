import type { Id } from "./_generated/dataModel";

export interface EmailWithImages {
	id: Id<"emails">;
	sender: string;
	subject?: string | null;
	textContent?: string | null;
	imageUrls: string[];
	receivedAt: Date | string | number;
}

export interface SelectedImage {
	imageUrl: string;
	emailId: Id<"emails">;
	subject: string;
	sender: string;
	textContent: string;
}

export interface GeneratedPost {
	caption_text: string;
	email_id?: Id<"emails"> | null;
	source_image_url?: string | null;
	source_image_urls?: string[] | null;
	created_at: Date | string | number;
	is_user_generated: boolean;
}

export interface ImageBlock {
	mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
	base64Data: string;
}

export interface CreatePostInput {
	captionText: string;
	imageUrl?: string;
	imageStorageId?: Id<"_storage">;
	organizationId: Id<"organizations">;
	emailId?: Id<"emails">;
	sourceImageUrl?: string;
	suggestedImage?: string;
	sourceImageUrls?: string[];
	isUserGenerated?: boolean;
}
