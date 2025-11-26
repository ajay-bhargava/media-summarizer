"use node";

import { Anthropic } from "@anthropic-ai/sdk";
import type {
	ImageBlockParam,
	TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import type { Id } from "../_generated/dataModel";
import type {
	EmailWithImages,
	GeneratedPost,
	ImageBlock,
	SelectedImage,
} from "../types";

// Batching Constants
const _MAX_BATCH_SIZE_MB = 30;
const _ESTIMATED_IMAGE_SIZE_KB = 500;

// Anthropic's max image size is 5 MB, but we use URL-based images to bypass base64 limits
const MAX_BASE64_IMAGE_SIZE_MB = 3.75;

function normalizeMediaType(
	contentType: string,
): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
	const normalized = contentType.toLowerCase().split(";")[0].trim();

	// Map common MIME types to supported formats
	if (normalized === "image/png" || normalized === "image/x-png") {
		return "image/png";
	}
	if (normalized === "image/jpeg" || normalized === "image/jpg") {
		return "image/jpeg";
	}
	if (normalized === "image/gif") {
		return "image/gif";
	}
	if (normalized === "image/webp") {
		return "image/webp";
	}
	return "image/png";
}

export async function fetchImageAsBase64(
	imageUrl: string,
): Promise<ImageBlock> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch image: ${response.statusText}`);
	}
	const contentType = response.headers.get("Content-Type");
	if (!contentType) {
		throw new Error("Content-Type not found");
	}
	const arrayBuffer = await response.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");
	return {
		mediaType: normalizeMediaType(contentType),
		base64Data: base64,
	};
}

/**
 * Get the size of an image from a URL without downloading the full content
 */
async function getImageSizeFromUrl(imageUrl: string): Promise<number> {
	// Use HEAD request first to get Content-Length
	try {
		const headResponse = await fetch(imageUrl, { method: "HEAD" });
		const contentLength = headResponse.headers.get("Content-Length");
		if (contentLength) {
			return Number.parseInt(contentLength, 10);
		}
	} catch {
		// HEAD not supported, fall through to GET
	}

	// Fall back to GET request
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch image: ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return arrayBuffer.byteLength;
}

export async function imageUrltoBase64(imageUrl: string): Promise<ImageBlock> {
	const dataUrlMatch = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
	if (dataUrlMatch) {
		return {
			mediaType: normalizeMediaType(dataUrlMatch[1]),
			base64Data: dataUrlMatch[2],
		};
	}
	// Handle HTTP URLs
	if (imageUrl.startsWith("http") || imageUrl.startsWith("https")) {
		return fetchImageAsBase64(imageUrl);
	}
	throw new Error(`Invalid image URL: ${imageUrl}`);
}

export async function generateInstagramCaptions(
	emails: EmailWithImages[],
	_date: Date,
): Promise<GeneratedPost[]> {
	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error("ANTHROPIC_API_KEY environment variable is not set");
	}

	const _anthropic = new Anthropic({
		apiKey: process.env.ANTHROPIC_API_KEY,
	});

	if (!emails || emails.length === 0) {
		return [];
	}
	console.log(`[AI] Using Anthropic Model: ${process.env.CLAUDE_MODEL}`);
	const allImages: Array<{
		imageUrl: string;
		emailId: Id<"emails">;
		subject: string;
		sender: string;
		textContent: string;
	}> = [];
	emails.forEach((email) => {
		email.imageUrls.forEach((imageUrl) => {
			allImages.push({
				imageUrl,
				emailId: email.id,
				subject: email.subject ?? "",
				sender: email.sender,
				textContent: email.textContent ?? "",
			});
		});
	});

	console.log(`[AI] Found ${allImages.length} images to process`);

	// Batch images into chunks of MAX_BATCH_SIZE_MB
	const batches: Array<typeof allImages> = [];
	let currentBatch: typeof allImages = [];
	let currentBatchSizeKB = 0;
	const maxBatchSizeKB = _MAX_BATCH_SIZE_MB * 1024;

	for (const image of allImages) {
		if (
			currentBatchSizeKB + _ESTIMATED_IMAGE_SIZE_KB > maxBatchSizeKB &&
			currentBatch.length > 0
		) {
			batches.push(currentBatch);
			currentBatch = [];
			currentBatchSizeKB = 0;
		}

		currentBatch.push(image);
		currentBatchSizeKB += _ESTIMATED_IMAGE_SIZE_KB;
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	console.log(`[AI] Batched images into ${batches.length} batches`);

	const allPosts: GeneratedPost[] = [];

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex];
		const posts = await processBatch(batch, _date, batchIndex);
		allPosts.push(...posts);

		// Stop if we have enough posts
		if (allPosts.length >= 3) {
			console.log(`[AI] Found enough posts, stopping at ${allPosts.length}`);
			break;
		}
	}

	console.log(`[AI] Generated ${allPosts.length} posts`);

	return allPosts.slice(0, 5);
}

async function processBatch(
	batch: Array<{
		imageUrl: string;
		emailId: Id<"emails">;
		subject: string;
		sender: string;
		textContent: string;
	}>,
	date: Date,
	batchIndex: number,
): Promise<GeneratedPost[]> {
	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error("ANTHROPIC_API_KEY environment variable is not set");
	}

	if (!process.env.CLAUDE_MODEL) {
		throw new Error("CLAUDE_MODEL environment variable is not set");
	}

	const anthropic = new Anthropic({
		apiKey: process.env.ANTHROPIC_API_KEY,
	});

	const contentBlocks: Array<TextBlockParam | ImageBlockParam> = [];

	contentBlocks.push({
		type: "text",
		text: `You are a social media manager for a school. Today's date is ${date.toISOString().split("T")[0]}.

You have ${batch.length} image${batch.length > 1 ? "s" : ""} from today's emails. Your task is to:
1. Review each image and its associated email content
2. Select the BEST 3-5 images that would make engaging Instagram posts
3. For each selected image, write an engaging Instagram caption (maximum 60 words)
4. The captions should be upbeat, engaging, and suitable for parents and students

Here are the images:\n\n`,
	});

	// Add each image with context
	for (let index = 0; index < batch.length; index++) {
		const image = batch[index];
		contentBlocks.push({
			type: "text",
			text: `--- Image ${index + 1} ---
Email ID: ${image.emailId}
Subject: ${image.subject ?? "No subject"}
From: ${image.sender ?? "Unknown"}
Text: ${(image.textContent ?? "").slice(0, 500)}\n`,
		});

		try {
			// First check the image size
			const imageSize = await getImageSizeFromUrl(image.imageUrl);
			const sizeInMB = imageSize / (1024 * 1024);
			console.log(
				`[AI] Batch ${batchIndex + 1}, Image ${index + 1}: ${sizeInMB.toFixed(2)}MB (${imageSize} bytes)`,
			);

			// For small images, use base64; for larger images, use URL
			if (sizeInMB <= MAX_BASE64_IMAGE_SIZE_MB) {
				// Use base64 for smaller images
				const { mediaType, base64Data } = await imageUrltoBase64(
					image.imageUrl,
				);
				contentBlocks.push({
					type: "image",
					source: {
						type: "base64",
						media_type: mediaType,
						data: base64Data,
					},
				});
			} else if (sizeInMB <= 20) {
				// Use URL-based image for larger images (up to 20 MB - Anthropic's URL limit)
				console.log(
					`[AI] Using URL-based image for ${index + 1} (${sizeInMB.toFixed(2)}MB)`,
				);
				contentBlocks.push({
					type: "image",
					source: {
						type: "url",
						url: image.imageUrl,
					},
				});
			} else {
				// Skip very large images
				console.warn(
					`[AI] Skipping image ${index + 1}: too large (${sizeInMB.toFixed(2)}MB > 20MB limit)`,
				);
				contentBlocks.push({
					type: "text",
					text: "[Image too large to process]\n",
				});
				continue;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(`[AI] Failed to process image ${index + 1}:`, errorMessage);
			contentBlocks.push({
				type: "text",
				text: "[Image could not be loaded]\n",
			});
		}

		contentBlocks.push({
			type: "text",
			text: "\n",
		});
	}

	contentBlocks.push({
		type: "text",
		text: `\n\nNow select the BEST 3-5 images and write captions for each. Respond in valid JSON with this exact shape:
{
  "posts": [
    {
      "image_index": 1,
      "caption": "Your engaging Instagram caption here...",
      "reasoning": "Why you selected this image"
    },
    ...
  ]
}

Select images that are visually interesting, tell a story, or highlight important school activities.`,
	});

	// Retry logic
	let response: Anthropic.Message | undefined;
	const retries = 3;
	let lastError: unknown;

	for (let i = 0; i < retries; i++) {
		try {
			response = await anthropic.messages.create({
				model: process.env.CLAUDE_MODEL,
				max_tokens: 4096,
				temperature: 0.7,
				system:
					"You are an expert social media manager for schools. You have a great eye for selecting the most engaging images and crafting compelling Instagram captions.",
				messages: [
					{
						role: "user",
						content: contentBlocks,
					},
				],
			});
			break;
		} catch (error) {
			lastError = error;
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				typeof (error as { status: unknown }).status === "number" &&
				(error as { status: number }).status === 529 &&
				i < retries - 1
			) {
				const waitTime = (i + 1) * 2000;
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			} else {
				throw error;
			}
		}
	}

	if (!response) {
		throw lastError || new Error("Failed to get response from Claude");
	}

	const messageContent =
		response.content?.[0]?.type === "text" ? response.content[0].text : "{}";

	try {
		let jsonString = messageContent.trim();
		if (jsonString.startsWith("```")) {
			jsonString = jsonString.replace(/^```(?:json|JSON)?\n?/, "");
			jsonString = jsonString.replace(/\n?```$/, "");
		}

		const parsed = JSON.parse(jsonString);

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("posts" in parsed) ||
			!Array.isArray(parsed.posts)
		) {
			throw new Error("Invalid response format: missing posts array");
		}

		const posts: GeneratedPost[] = [];

		for (const postData of parsed.posts) {
			if (
				typeof postData !== "object" ||
				postData === null ||
				!("image_index" in postData) ||
				!("caption" in postData) ||
				typeof postData.caption !== "string"
			) {
				continue;
			}

			const imageIndex = postData.image_index - 1;
			if (imageIndex < 0 || imageIndex >= batch.length) {
				continue;
			}

			const image = batch[imageIndex];
			posts.push({
				caption_text: postData.caption,
				email_id: image.emailId,
				source_image_url: image.imageUrl,
				source_image_urls: [image.imageUrl],
				created_at: date.toISOString(),
				is_user_generated: false,
			});
		}

		return posts;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("[AI] Failed to parse Claude response:", errorMessage);
		return [];
	}
}

export async function generateCombinedPost({
	images,
	date,
}: {
	images: SelectedImage[];
	date: Date;
}): Promise<GeneratedPost> {
	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error("ANTHROPIC_API_KEY environment variable is not set");
	}

	if (!process.env.CLAUDE_MODEL) {
		throw new Error("CLAUDE_MODEL environment variable is not set");
	}

	const anthropic = new Anthropic({
		apiKey: process.env.ANTHROPIC_API_KEY,
	});

	if (!images || images.length === 0) {
		throw new Error("No images provided");
	}

	if (images.length > 5) {
		throw new Error("Maximum 5 images can be selected");
	}

	console.log(
		`[AI] Generating combined post from ${images.length} selected images`,
	);
	console.log(`[AI] Using Claude model: ${process.env.CLAUDE_MODEL}`);

	const contentBlocks: Array<TextBlockParam | ImageBlockParam> = [];

	// Add intro text
	contentBlocks.push({
		type: "text",
		text: `You are a social media manager for a school. Today's date is ${date.toISOString().split("T")[0]}.

A user has selected ${images.length} image${images.length > 1 ? "s" : ""} to create an Instagram post.

Your task is to:
1. Review all ${images.length} image${images.length > 1 ? "s" : ""} and their associated email content
2. Write ONE engaging Instagram caption that captures the essence of all the images together
3. The caption should be engaging, upbeat, and mention key details
4. Maximum 60 words

Here are the selected images:\n\n`,
	});

	// Add each image with context
	for (let index = 0; index < images.length; index++) {
		const image = images[index];
		contentBlocks.push({
			type: "text",
			text: `--- Image ${index + 1} ---
Subject: ${image.subject ?? "No subject"}
From: ${image.sender ?? "Unknown"}
Text: ${(image.textContent ?? "").slice(0, 500)}\n`,
		});

		// Process image - use base64 for small images, URL for larger ones
		try {
			const imageSize = await getImageSizeFromUrl(image.imageUrl);
			const sizeInMB = imageSize / (1024 * 1024);
			console.log(
				`[AI] User-selected image ${index + 1}: ${sizeInMB.toFixed(2)}MB (${imageSize} bytes)`,
			);

			if (sizeInMB <= MAX_BASE64_IMAGE_SIZE_MB) {
				// Use base64 for smaller images
				const { mediaType, base64Data } = await imageUrltoBase64(
					image.imageUrl,
				);
				contentBlocks.push({
					type: "image",
					source: {
						type: "base64",
						media_type: mediaType,
						data: base64Data,
					},
				});
			} else if (sizeInMB <= 20) {
				// Use URL-based image for larger images
				console.log(
					`[AI] Using URL-based image for ${index + 1} (${sizeInMB.toFixed(2)}MB)`,
				);
				contentBlocks.push({
					type: "image",
					source: {
						type: "url",
						url: image.imageUrl,
					},
				});
			} else {
				// Skip very large images
				console.warn(
					`[AI] Skipping image ${index + 1}: too large (${sizeInMB.toFixed(2)}MB > 20MB limit)`,
				);
				contentBlocks.push({
					type: "text",
					text: "[Image too large to process]\n",
				});
				continue;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(`[AI] Failed to process image ${index + 1}:`, errorMessage);
			contentBlocks.push({
				type: "text",
				text: "[Image could not be loaded]\n",
			});
		}

		contentBlocks.push({
			type: "text",
			text: "\n",
		});
	}

	// Add instructions for response format
	contentBlocks.push({
		type: "text",
		text: `\n\nNow write a single Instagram caption that captures all ${images.length} image${images.length > 1 ? "s" : ""}. Respond in valid JSON with this exact shape:
{
  "caption": "Your engaging Instagram caption here...",
  "reasoning": "Brief explanation of your caption choice"
}

Make the caption upbeat, engaging, and suitable for parents and students.`,
	});

	// Retry logic for overloaded errors
	let response: Anthropic.Message | undefined;
	const retries = 3;
	let lastError: unknown;

	for (let i = 0; i < retries; i++) {
		try {
			console.log(
				`[AI] Sending request to Claude (attempt ${i + 1}/${retries})...`,
			);
			response = await anthropic.messages.create({
				model: process.env.CLAUDE_MODEL,
				max_tokens: 2048,
				temperature: 0.7,
				system:
					"You are an expert social media manager for schools. You have a great eye for crafting compelling Instagram captions that capture multiple moments and activities.",
				messages: [
					{
						role: "user",
						content: contentBlocks,
					},
				],
			});
			break; // Success, exit retry loop
		} catch (error) {
			lastError = error;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`[AI] Attempt ${i + 1} failed:`, errorMessage);

			// If it's an overloaded error and we have retries left, wait and retry
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				typeof (error as { status: unknown }).status === "number" &&
				(error as { status: number }).status === 529 &&
				i < retries - 1
			) {
				const waitTime = (i + 1) * 2000; // 2s, 4s, 6s
				console.log(`[AI] Claude overloaded, retrying in ${waitTime}ms...`);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			} else {
				throw error; // No more retries or different error
			}
		}
	}

	if (!response) {
		throw lastError || new Error("Failed to get response from Claude");
	}

	const messageContent =
		response.content?.[0]?.type === "text" ? response.content[0].text : "{}";

	try {
		// Strip markdown code fences if present
		let jsonString = messageContent.trim();
		if (jsonString.startsWith("```")) {
			jsonString = jsonString.replace(/^```(?:json|JSON)?\n?/, "");
			jsonString = jsonString.replace(/\n?```$/, "");
		}

		const parsed = JSON.parse(jsonString);

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("caption" in parsed) ||
			typeof parsed.caption !== "string"
		) {
			throw new Error("Invalid response format: missing or invalid caption");
		}

		// Collect all image URLs
		const sourceImageUrls = images.map((img) => img.imageUrl);

		return {
			caption_text: parsed.caption,
			source_image_url: sourceImageUrls[0] || null,
			source_image_urls: sourceImageUrls,
			created_at: date.toISOString(),
			is_user_generated: true,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("[AI] Failed to parse Claude response:", errorMessage);
		throw new Error(`Failed to parse AI response: ${errorMessage}`);
	}
}
