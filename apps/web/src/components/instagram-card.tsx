import { Download, Copy, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InstagramCardProps = {
	post: {
		_id: string;
		captionText: string;
		imageUrl?: string;
		sourceImageUrl?: string;
		sourceImageUrls?: string[];
		createdAt: number;
		isUserGenerated: boolean;
	};
};

export function InstagramCard({ post }: InstagramCardProps) {
	const [isLoading, setIsLoading] = useState(false);
	const imageUrl = post.imageUrl || post.sourceImageUrl || post.sourceImageUrls?.[0];

	const handleDownloadImage = async () => {
		if (!imageUrl) {
			toast.error("No image available to download");
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `instagram-post-${post._id}.jpg`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success("Image downloaded!");
		} catch (error) {
			toast.error("Failed to download image");
			console.error("Download error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopyImage = async () => {
		if (!imageUrl) {
			toast.error("No image available to copy");
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);
			toast.success("Image copied to clipboard!");
		} catch (error) {
			toast.error("Failed to copy image");
			console.error("Copy error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopyCaption = async () => {
		try {
			await navigator.clipboard.writeText(post.captionText);
			toast.success("Caption copied to clipboard!");
		} catch (error) {
			toast.error("Failed to copy caption");
			console.error("Copy error:", error);
		}
	};

	return (
		<div className="group relative w-full max-w-md">
			<Card className="relative flex aspect-[4/5] w-full flex-col overflow-hidden">
				{imageUrl && (
					<div className="relative h-[70%] w-full overflow-hidden bg-muted/20">
						<img
							src={imageUrl}
							alt="Instagram post"
							className="h-full w-full object-cover object-center"
						/>
					</div>
				)}
				<CardContent className="flex flex-1 flex-col gap-3 p-4">
					<div className="flex-1">
						<div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
							{post.captionText}
						</div>
					</div>
					<div className="flex gap-2 flex-wrap">
						<Button
							type="button"
							variant="neutral"
							size="sm"
							onClick={handleDownloadImage}
							disabled={isLoading || !imageUrl}
							className="flex-1 min-w-[100px]"
						>
							<Download className="h-4 w-4" />
							Download
						</Button>
						<Button
							type="button"
							variant="neutral"
							size="sm"
							onClick={handleCopyImage}
							disabled={isLoading || !imageUrl}
							className="flex-1 min-w-[100px]"
						>
							<ImageIcon className="h-4 w-4" />
							Copy Image
						</Button>
						<Button
							type="button"
							variant="neutral"
							size="sm"
							onClick={handleCopyCaption}
							disabled={isLoading}
							className="flex-1 min-w-[100px]"
						>
							<Copy className="h-4 w-4" />
							Copy Caption
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

