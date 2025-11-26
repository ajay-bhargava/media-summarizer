"use client";

import { api } from "@socialmedia/backend/convex/_generated/api";
import type { Id } from "@socialmedia/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CronSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationId: string;
}

// EST is UTC-5 (Eastern Standard Time)
const EST_OFFSET = -5;

/**
 * Convert UTC hour to EST hour
 */
function utcToEst(hour: number): number {
	let estHour = hour + EST_OFFSET;
	if (estHour < 0) {
		estHour += 24;
	}
	return estHour;
}

/**
 * Convert EST hour to UTC hour
 */
function estToUtc(hour: number): number {
	let utcHour = hour - EST_OFFSET;
	if (utcHour >= 24) {
		utcHour -= 24;
	}
	return utcHour;
}

/**
 * Parse cron spec (stored in UTC) to extract time in EST (e.g., "0 11 * * *" → "06:00" EST)
 */
function parseCronToTime(cronSpec: string | null | undefined): string {
	if (!cronSpec) {
		return "06:00"; // Default to 6 AM EST
	}

	// Cron format: "minute hour day month dayOfWeek"
	// or "second minute hour day month dayOfWeek"
	const parts = cronSpec.trim().split(/\s+/);

	if (parts.length === 5) {
		// Standard cron: minute hour day month dayOfWeek
		const utcHour = Number.parseInt(parts[1], 10);
		const minute = Number.parseInt(parts[0], 10);
		if (!Number.isNaN(utcHour) && !Number.isNaN(minute)) {
			const estHour = utcToEst(utcHour);
			return `${estHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
		}
	} else if (parts.length === 6) {
		// With seconds: second minute hour day month dayOfWeek
		const utcHour = Number.parseInt(parts[2], 10);
		const minute = Number.parseInt(parts[1], 10);
		if (!Number.isNaN(utcHour) && !Number.isNaN(minute)) {
			const estHour = utcToEst(utcHour);
			return `${estHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
		}
	}

	return "06:00"; // Default fallback
}

/**
 * Convert time picker value (EST) to cron spec (UTC) (e.g., "06:00" EST → "0 11 * * *" UTC)
 */
function convertTimeToCron(time: string): string {
	const [hourStr, minuteStr] = time.split(":");
	const estHour = Number.parseInt(hourStr || "6", 10);
	const minute = Number.parseInt(minuteStr || "0", 10);
	const utcHour = estToUtc(estHour);
	return `${minute} ${utcHour} * * *`;
}

export function CronSettingsDialog({
	open,
	onOpenChange,
	organizationId,
}: CronSettingsDialogProps) {
	const cronSettings = useQuery(
		api.queries.organizations.getOrganizationCronSettings,
		{ organizationId: organizationId as Id<"organizations"> },
	);
	const setCronSchedule = useMutation(
		api.mutations.crons.setOrganizationCronSchedule,
	);

	const [time, setTime] = React.useState("06:00");
	const [enabled, setEnabled] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);

	// Update local state when cron settings are loaded
	React.useEffect(() => {
		if (cronSettings) {
			setTime(parseCronToTime(cronSettings.cronSchedule));
			setEnabled(cronSettings.cronEnabled ?? false);
		}
	}, [cronSettings]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!time) {
			toast.error("Please select a time");
			return;
		}

		setIsSaving(true);
		try {
			const cronSpec = convertTimeToCron(time);
			await setCronSchedule({
				organizationId: organizationId as Id<"organizations">,
				cronSchedule: cronSpec,
				enabled,
			});
			toast.success(
				enabled
					? `Cron job enabled and scheduled for ${time} daily`
					: "Cron job disabled",
			);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save cron settings",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const isLoading = cronSettings === undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="bg-background"
				style={{ backgroundColor: "var(--background)" }}
			>
				<DialogHeader>
					<DialogTitle>Post Generation Settings</DialogTitle>
					<DialogDescription>
						Configure when automatic post generation runs daily. Posts are
						generated from emails with images received on the current day.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSave}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="cron-time">Daily Run Time (EST)</Label>
							<Input
								id="cron-time"
								type="time"
								value={time}
								onChange={(e) => setTime(e.target.value)}
								disabled={isLoading || isSaving}
								required
							/>
							<p className="text-muted-foreground text-xs">
								Select the time of day (Eastern Standard Time) when posts should
								be automatically generated.
							</p>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="cron-enabled"
								checked={enabled}
								onCheckedChange={(checked) => setEnabled(checked === true)}
								disabled={isLoading || isSaving}
							/>
							<Label
								htmlFor="cron-enabled"
								className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Enable automatic post generation
							</Label>
						</div>
						{!enabled && (
							<p className="text-muted-foreground text-xs">
								When disabled, posts will not be automatically generated. You
								can still generate posts manually.
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="neutral"
							onClick={() => onOpenChange(false)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading || isSaving}>
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
