import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";

/**
 * Requires that the current user is authenticated and belongs to an organization.
 * Returns the user profile with organization information.
 * Throws an error if the user is not authenticated or doesn't have a profile.
 *
 * With better-auth, this function:
 * 1. Gets the Convex identity via ctx.auth.getUserIdentity()
 * 2. Uses identity.subject (token identifier) to look up the user profile
 * 3. The userProfiles.userId field should store the Convex token identifier
 *
 * If your userProfiles.userId stores the better-auth user ID instead, you'll need
 * to query the better-auth session table to get the userId from the session.
 */
export async function requireOrganization(ctx: MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	// With better-auth Convex plugin, identity.subject is the Convex token identifier
	// This should match userProfiles.userId if it's set up to store the token identifier
	const userId = identity.subject;

	const profile = await ctx.db
		.query("userProfiles")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();

	if (!profile) {
		throw new Error(
			`User profile not found for userId: ${userId}. Make sure userProfiles.userId stores the Convex token identifier (identity.subject).`,
		);
	}

	const organization = await ctx.db.get(profile.organizationId);
	if (!organization) {
		throw new Error("Organization not found");
	}

	return {
		user: profile,
		organization,
		organizationId: profile.organizationId,
	};
}

/**
 * Verifies that the given organizationId matches the user's organization.
 * Throws an error if they don't match.
 */
export async function requireOrganizationMatch(
	ctx: MutationCtx,
	organizationId: string,
) {
	const { organizationId: userOrgId } = await requireOrganization(ctx);
	if (userOrgId !== organizationId) {
		throw new Error("Organization mismatch");
	}
	return { organizationId: userOrgId };
}

/**
 * Return type for CheckOrganizationMembership
 */
export interface OrganizationMembership {
	user: {
		_id: Id<"userProfiles">;
		_creationTime: number;
		userId: string;
		organizationId: Id<"organizations">;
		role: string;
		createdAt: number;
		organization: {
			_id: Id<"organizations">;
			_creationTime: number;
			name: string;
			recipientEmail: string;
			createdAt: number;
		} | null;
	};
	organization: {
		_id: Id<"organizations">;
		_creationTime: number;
		name: string;
		recipientEmail: string;
		createdAt: number;
	};
	organizationId: Id<"organizations">;
}

/**
 * Requires that the current user is authenticated and belongs to an organization.
 * Works with ActionCtx (for actions).
 * Returns the user profile with organization information.
 * Throws an error if the user is not authenticated or doesn't have a profile.
 */
export async function CheckOrganizationMembership(
	ctx: ActionCtx,
): Promise<OrganizationMembership> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	const userId = identity.subject;

	const profile: {
		_id: Id<"userProfiles">;
		_creationTime: number;
		userId: string;
		organizationId: Id<"organizations">;
		role: string;
		createdAt: number;
		organization: {
			_id: Id<"organizations">;
			_creationTime: number;
			name: string;
			recipientEmail: string;
			createdAt: number;
		} | null;
	} | null = await ctx.runQuery(api.queries.userProfiles.getUserProfile, {
		userId,
	});

	if (!profile) {
		throw new Error(
			`User profile not found for userId: ${userId}. Make sure userProfiles.userId stores the Convex token identifier (identity.subject).`,
		);
	}

	if (!profile.organization) {
		throw new Error("Organization not found");
	}

	return {
		user: profile,
		organization: profile.organization,
		organizationId: profile.organizationId,
	};
}
