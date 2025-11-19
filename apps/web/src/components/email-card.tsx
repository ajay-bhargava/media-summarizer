import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Check } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useEmailSelectionStore } from "@/stores/email-selection-store";

type EmailCardProps = {
	email: {
		_id: string;
		sender: string;
		subject?: string;
		receivedAt: number;
		rawText?: string;
		parsedContent?: {
			imageUrls?: string[];
			textContent?: string;
		} | null;
	};
};

export function EmailCard({ email }: EmailCardProps) {
	const { selectedEmailIds, toggleEmail } = useEmailSelectionStore();
	const isSelected = selectedEmailIds.has(email._id);
	const imageUrls = email.parsedContent?.imageUrls || [];
	const textContent = email.parsedContent?.textContent || email.rawText || "";
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleImageClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		// Only open dialog if there are multiple photos, as requested.
		if (imageUrls.length > 1) {
			setIsDialogOpen(true);
		}
	};

	return (
		<div className="group relative w-full max-w-md">
			<div className="relative">
				{/* Overhanging Selection Button */}
				<button
					type="button"
					className={`-right-3 -top-3 absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-md transition-all ${
						isSelected
							? "border-green-500 bg-green-500 text-white"
							: "border-muted-foreground bg-background text-muted-foreground opacity-0 hover:border-green-500 hover:text-green-500 focus:opacity-100 group-hover:opacity-100"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						toggleEmail(email._id);
					}}
				>
					<Check
						className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0 hover:opacity-100"}`}
					/>
				</button>

				<Card
					className={`relative flex aspect-3/4 w-full flex-col overflow-hidden transition-all ${
						isSelected
							? "border-green-500 ring-1 ring-green-500"
							: "hover:opacity-90"
					}`}
				>
					{imageUrls.length > 0 && (
						<div className="group/image relative h-[66.666%] w-full overflow-hidden bg-muted/20">
							{imageUrls.length > 1 ? (
								<button
									type="button"
									className="relative h-full w-full cursor-pointer"
									onClick={handleImageClick}
								>
									<img
										src={imageUrls[0]}
										alt={`Content from ${email.sender}`}
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
									src={imageUrls[0]}
									alt={`Content from ${email.sender}`}
									className="h-full w-full object-cover object-center"
								/>
							)}
						</div>
					)}
					<CardContent className="flex-1 p-4">
						<div className="space-y-2">
							<div>
								<div className="font-semibold text-2xl text-foreground leading-tight">
									{email.subject || "No subject"}
								</div>
								<div className="text-muted-foreground text-xs lowercase leading-tight">
									{email.sender}
								</div>
							</div>
							{textContent && (
								<div className="text-muted-foreground/80 text-sm italic">
									&ldquo;{textContent}&rdquo;
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
					<VisuallyHidden>
						<DialogTitle>Email Images</DialogTitle>
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
											alt={`Full resolution ${index + 1} from ${email.sender}`}
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
