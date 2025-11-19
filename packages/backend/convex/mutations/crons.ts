import { Crons } from "@convex-dev/crons";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireOrganizationMatch } from "../lib/auth";

export const setOrganizationCronSchedule = mutation({
	args: {
		organizationId: v.id("organizations"),
		cronSchedule: v.string(),
		enabled: v.boolean(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		cronJobId?: string;
		message: string;
	}> => {
		const crons = new Crons(components.crons);
		// Validate user belongs to organization
		await requireOrganizationMatch(ctx, args.organizationId);

		// Get current organization
		const organization = await ctx.db.get(args.organizationId);
		if (!organization) {
			throw new Error("Organization not found");
		}

		// Basic cron spec validation (should be 5 or 6 fields)
		const cronParts = args.cronSchedule.trim().split(/\s+/);
		if (cronParts.length !== 5 && cronParts.length !== 6) {
			throw new Error(
				"Invalid cron schedule format. Expected format: 'minute hour day month dayOfWeek' or 'second minute hour day month dayOfWeek'",
			);
		}

		// If there's an existing cron job, delete it first
		if (organization.cronJobId) {
			try {
				await crons.delete(ctx, { id: organization.cronJobId });
				console.log(
					`[Cron] Deleted existing cron job ${organization.cronJobId} for organization ${args.organizationId}`,
				);
			} catch (error) {
				// If cron doesn't exist, that's okay - just log and continue
				console.warn(
					`[Cron] Could not delete existing cron job ${organization.cronJobId}:`,
					error,
				);
			}
		}

		let cronJobId: string | undefined;

		// Register new cron job if enabled
		if (args.enabled) {
			try {
				const cronName = `email-post-cron-${args.organizationId}`;
				cronJobId = await crons.register(
					ctx,
					{ kind: "cron", cronspec: args.cronSchedule },
					internal.actions.posts.runCronPostGeneration,
					{ organizationId: args.organizationId },
					cronName,
				);
				console.log(
					`[Cron] Registered new cron job ${cronJobId} for organization ${args.organizationId} with schedule: ${args.cronSchedule}`,
				);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				console.error(
					`[Cron] Failed to register cron job for organization ${args.organizationId}:`,
					errorMessage,
				);
				throw new Error(`Failed to register cron job: ${errorMessage}`);
			}
		}

		// Update organization record
		await ctx.db.patch(args.organizationId, {
			cronSchedule: args.cronSchedule,
			cronEnabled: args.enabled,
			cronJobId,
		});

		return {
			success: true,
			cronJobId,
			message: args.enabled
				? `Cron job registered with schedule: ${args.cronSchedule}`
				: "Cron job disabled",
		};
	},
});

export const disableOrganizationCron = mutation({
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		message: string;
	}> => {
		const crons = new Crons(components.crons);
		// Validate user belongs to organization
		await requireOrganizationMatch(ctx, args.organizationId);

		// Get current organization
		const organization = await ctx.db.get(args.organizationId);
		if (!organization) {
			throw new Error("Organization not found");
		}

		// Delete the cron job if it exists
		if (organization.cronJobId) {
			try {
				await crons.delete(ctx, { id: organization.cronJobId });
				console.log(
					`[Cron] Deleted cron job ${organization.cronJobId} for organization ${args.organizationId}`,
				);
			} catch (error) {
				// If cron doesn't exist, that's okay - just log and continue
				console.warn(
					`[Cron] Could not delete cron job ${organization.cronJobId}:`,
					error,
				);
			}
		}

		// Update organization record to disable cron and clear job ID
		await ctx.db.patch(args.organizationId, {
			cronEnabled: false,
			cronJobId: undefined,
		});

		return {
			success: true,
			message: "Cron job disabled and deleted",
		};
	},
});
