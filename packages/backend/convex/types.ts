export interface EmailWithImages {
	id: string;
	sender: string;
	subject?: string | null;
	textContent?: string | null;
	imageUrls: string[];
	receivedAt: Date | string | number;
}

export interface SelectedImage {
	imageUrl: string;
	emailId: string;
	subject: string;
	sender: string;
	textContent: string;
}

export interface GeneratedPost {
	caption_text: string;
	email_id?: string | null;
	source_image_url?: string | null;
	source_image_urls?: string[] | null;
	created_at: string;
	is_user_generated?: boolean;
}

export interface ImageBlock {
	mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
	base64Data: string;
}
