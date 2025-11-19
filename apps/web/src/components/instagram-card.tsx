import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Download, Copy, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type InstagramCardProps = {
	post: {
		_id: string;
		captionText: string;
		imageUrl?: string;
		sourceImageUrls?: string[];
		createdAt: number;
		isUserGenerated: boolean;
	};
};

export function InstagramCard({ post }: InstagramCardProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const imageUrls = post.sourceImageUrls || (post.imageUrl ? [post.imageUrl] : []);
	const primaryImageUrl = imageUrls[0] || post.imageUrl;

	const handleImageClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (imageUrls.length > 1) {
			setIsDialogOpen(true);
		}
	};

	const handleDownloadImage = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!primaryImageUrl) return;

		try {
			const response = await fetch(primaryImageUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `instagram-post-${post._id}.jpg`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success("Image downloaded");
		} catch (error) {
			toast.error("Failed to download image");
			console.error("Download error:", error);
		}
	};

	const handleCopyCaption = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(post.captionText);
			toast.success("Caption copied to clipboard");
		} catch (error) {
			toast.error("Failed to copy caption");
			console.error("Copy error:", error);
		}
	};

	const handleCopyImage = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!primaryImageUrl) return;

		try {
			const response = await fetch(primaryImageUrl);
			const blob = await response.blob();
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);
			toast.success("Image copied to clipboard");
		} catch (error) {
			toast.error("Failed to copy image");
			console.error("Copy image error:", error);
		}
	};

	return (
		<div className="group relative w-full max-w-md">
			<div className="relative">
				<Card className="relative flex aspect-3/4 w-full flex-col overflow-hidden transition-all hover:opacity-90">
					{primaryImageUrl && (
						<div className="group/image relative h-[66.666%] w-full overflow-hidden bg-muted/20">
							{imageUrls.length > 1 ? (
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
									<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover/image:opacity-100">
										<div className="text-center text-white">
											<div className="font-bold text-2xl">
												{imageUrls.length}
											</div>
											<div className="text-sm">photos</div>
											<div className="mt-1 text-xs opacity-80">
												Click to view
											</div>
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
					)}
					<CardContent className="flex flex-1 flex-col gap-3 p-4">
						<div className="flex-1 space-y-2">
							<div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
								{post.captionText}
							</div>
						</div>
						<div className="flex gap-2 pt-2 border-t">
							<Button
								variant="neutral"
								size="sm"
								onClick={handleDownloadImage}
								className="flex-1"
								disabled={!primaryImageUrl}
							>
								<Download className="h-4 w-4" />
								Download
							</Button>
							<Button
								variant="neutral"
								size="sm"
								onClick={handleCopyCaption}
								className="flex-1"
							>
								<Copy className="h-4 w-4" />
								Copy Text
							</Button>
							<Button
								variant="neutral"
								size="sm"
								onClick={handleCopyImage}
								className="flex-1"
								disabled={!primaryImageUrl}
							>
								<ImageIcon className="h-4 w-4" />
								Copy Image
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
					<VisuallyHidden>
						<DialogTitle>Post Images</DialogTitle>
					</VisuallyHidden>
					<div className="relative w-full">
						<Carousel className="w-full">
							<CarouselContent>
								{imageUrls.map((imageUrl, index) => (
									<CarouselItem
										key={imageUrl}
										className="flex items-center justify-center"
									>
										<img
											src={imageUrl}
											alt={`Post image ${index + 1}`}
											className="max-h-[80vh] w-auto object-contain"
										/>
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

