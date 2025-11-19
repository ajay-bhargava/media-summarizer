import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Copy, Download, Image as ImageIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type InstagramCardProps = {
	post: {
		_id: string;
		captionText: string;
		createdAt: number;
		sourceImageUrls?: string[];
		sourceImageUrl?: string;
		imageUrl?: string;
		isUserGenerated?: boolean;
	};
};

export function InstagramCard({ post }: InstagramCardProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isCopyingImage, setIsCopyingImage] = useState(false);

	// Get image URLs - prefer sourceImageUrls array, fallback to sourceImageUrl or imageUrl
	const imageUrls =
		post.sourceImageUrls && post.sourceImageUrls.length > 0
			? post.sourceImageUrls
			: post.sourceImageUrl
				? [post.sourceImageUrl]
				: post.imageUrl
					? [post.imageUrl]
					: [];

	const primaryImageUrl = imageUrls[0];
	const hasMultipleImages = imageUrls.length > 1;

	const handleImageClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (hasMultipleImages) {
			setIsDialogOpen(true);
		}
	};

	const downloadImage = async (imageUrl: string, index: number = 0) => {
		if (isDownloading) return;
		setIsDownloading(true);

		try {
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error("Failed to fetch image");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `instagram-post-${post._id}-${index + 1}.${blob.type.split("/")[1] || "jpg"}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Image downloaded successfully!");
		} catch (error) {
			console.error("Error downloading image:", error);
			toast.error("Failed to download image. Please try again.");
		} finally {
			setIsDownloading(false);
		}
	};

	const copyImageToClipboard = async (imageUrl: string) => {
		if (isCopyingImage) return;
		setIsCopyingImage(true);

		try {
			// Check if ClipboardItem is supported
			if (!window.ClipboardItem) {
				throw new Error("ClipboardItem API not supported in this browser");
			}

			// Try to use the already-loaded image from DOM first (avoids CORS issues)
			let img: HTMLImageElement | null = null;
			
			// Look for the image in the current card
			const cardElement = document.querySelector(`[data-post-id="${post._id}"]`);
			const domImg = cardElement?.querySelector("img") as HTMLImageElement | null;
			
			if (domImg && domImg.complete && domImg.naturalWidth > 0) {
				// Use the already-loaded image from DOM
				img = domImg;
			} else {
				// Fallback: create new image element
				img = new Image();
				img.crossOrigin = "anonymous";
				
				// Wait for image to load
				await new Promise<void>((resolve, reject) => {
					img!.onload = () => resolve();
					img!.onerror = () => reject(new Error("Failed to load image"));
					img!.src = imageUrl;
				});
			}

			// Create canvas and draw image
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth || img.width;
			canvas.height = img.naturalHeight || img.height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Failed to get canvas context");
			}
			ctx.drawImage(img, 0, 0);

			// Convert canvas to blob
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to convert canvas to blob"));
					}
				}, "image/png");
			});

			// Copy to clipboard
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);

			toast.success("Image copied to clipboard!");
		} catch (error) {
			console.error("Error copying image:", error);
			// Fallback: try direct fetch if canvas approach fails
			try {
				const response = await fetch(imageUrl, { mode: "cors" });
				if (!response.ok) {
					throw new Error("Failed to fetch image");
				}
				const blob = await response.blob();
				await navigator.clipboard.write([
					new ClipboardItem({
						[blob.type]: blob,
					}),
				]);
				toast.success("Image copied to clipboard!");
			} catch (fallbackError) {
				console.error("Fallback copy also failed:", fallbackError);
				const errorMessage =
					fallbackError instanceof Error
						? fallbackError.message
						: "Unknown error";
				if (errorMessage.includes("CORS") || errorMessage.includes("blocked")) {
					toast.error(
						"Image copy blocked by browser security. Please download the image instead.",
					);
				} else {
					toast.error(
						"Failed to copy image. Your browser may not support this feature. Try downloading instead.",
					);
				}
			}
		} finally {
			setIsCopyingImage(false);
		}
	};

	const copyCaption = async () => {
		try {
			await navigator.clipboard.writeText(post.captionText);
			toast.success("Caption copied to clipboard!");
		} catch (error) {
			console.error("Error copying caption:", error);
			toast.error("Failed to copy caption. Please try again.");
		}
	};

	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		});
	};

	if (!primaryImageUrl) {
		return (
			<Card className="relative flex w-full max-w-md flex-col overflow-hidden">
				<CardContent className="flex-1 p-4">
					<div className="space-y-2">
						<div className="text-muted-foreground text-sm">
							{formatDate(post.createdAt)}
						</div>
						<div className="font-medium text-foreground">
							{post.captionText}
						</div>
						<Button
							variant="neutral"
							size="sm"
							onClick={copyCaption}
							className="mt-2"
						>
							<Copy className="h-4 w-4" />
							Copy Caption
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="group relative w-full max-w-md" data-post-id={post._id}>
			<Card className="relative flex aspect-square w-full flex-col overflow-hidden">
				{/* Image Section - Square Aspect Ratio */}
				<div className="relative h-full w-full overflow-hidden bg-muted/20">
					{hasMultipleImages ? (
						<button
							type="button"
							className="relative h-full w-full cursor-pointer"
							onClick={handleImageClick}
						>
							<img
								src={primaryImageUrl}
								alt="Instagram post"
								className="h-full w-full object-cover object-center"
							/>
							<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
								<div className="text-center text-white">
									<div className="font-bold text-2xl">{imageUrls.length}</div>
									<div className="text-sm">photos</div>
									<div className="mt-1 text-xs opacity-80">Click to view</div>
								</div>
							</div>
						</button>
					) : (
						<img
							src={primaryImageUrl}
							alt="Instagram post"
							className="h-full w-full object-cover object-center"
						/>
					)}
				</div>

				{/* Action Buttons Overlay */}
				<div className="absolute bottom-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
					<Button
						variant="noShadow"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							downloadImage(primaryImageUrl);
						}}
						disabled={isDownloading}
						className="h-8 w-8 bg-white/90 hover:bg-white"
						title="Download image"
					>
						<Download className="h-4 w-4 text-black" />
					</Button>
					<Button
						variant="noShadow"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							copyImageToClipboard(primaryImageUrl);
						}}
						disabled={isCopyingImage}
						className="h-8 w-8 bg-white/90 hover:bg-white"
						title="Copy image"
					>
						<ImageIcon className="h-4 w-4 text-black" />
					</Button>
				</div>
			</Card>

			{/* Caption Section */}
			<Card className="mt-2">
				<CardContent className="p-4">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div className="text-muted-foreground text-xs">
								{formatDate(post.createdAt)}
								{post.isUserGenerated && (
									<span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 text-xs">
										User Generated
									</span>
								)}
							</div>
						</div>
						<div className="font-medium text-foreground leading-relaxed">
							{post.captionText}
						</div>
						<div className="flex gap-2">
							<Button
								variant="neutral"
								size="sm"
								onClick={copyCaption}
								className="flex-1"
							>
								<Copy className="h-4 w-4" />
								Copy Caption
							</Button>
							{hasMultipleImages && (
								<Button
									variant="neutral"
									size="sm"
									onClick={() => setIsDialogOpen(true)}
								>
									View All ({imageUrls.length})
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Image Carousel Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
					<VisuallyHidden>
						<DialogTitle>Instagram Post Images</DialogTitle>
					</VisuallyHidden>
					<div className="relative w-full">
						<Carousel className="w-full">
							<CarouselContent>
								{imageUrls.map((imageUrl, index) => (
									<CarouselItem
										key={imageUrl}
										className="flex flex-col items-center justify-center gap-4"
									>
										<img
											src={imageUrl}
											alt={`Instagram post image ${index + 1}`}
											className="max-h-[70vh] w-auto object-contain"
										/>
										<div className="flex gap-2">
											<Button
												variant="neutral"
												size="sm"
												onClick={() => downloadImage(imageUrl, index)}
												disabled={isDownloading}
											>
												<Download className="h-4 w-4" />
												Download
											</Button>
											<Button
												variant="neutral"
												size="sm"
												onClick={() => copyImageToClipboard(imageUrl)}
												disabled={isCopyingImage}
											>
												<ImageIcon className="h-4 w-4" />
												Copy Image
											</Button>
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
							{imageUrls.length > 1 && (
								<>
									<CarouselPrevious className="-left-12 h-12 w-12 border-none bg-white/20 text-white hover:bg-white/40" />
									<CarouselNext className="-right-12 h-12 w-12 border-none bg-white/20 text-white hover:bg-white/40" />
								</>
							)}
						</Carousel>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

