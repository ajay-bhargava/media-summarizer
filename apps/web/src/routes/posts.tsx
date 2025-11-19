import { api } from "@socialmedia/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { InstagramCard } from "@/components/instagram-card";
import type { Route } from "./+types/posts";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Posts - PS15 Social Media System" },
		{ name: "description", content: "Manage your social media posts" },
	];
}

type PostWithContent = {
	_id: string;
	captionText: string;
	imageUrl?: string;
	sourceImageUrl?: string;
	sourceImageUrls?: string[];
	createdAt: number;
	isUserGenerated: boolean;
};

type GroupedPosts = {
	label: string;
	posts: PostWithContent[];
};

function groupPostsByDate(posts: PostWithContent[]): GroupedPosts[] {
	const todayStart = new Date().setHours(0, 0, 0, 0);
	const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
	const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

	const groups: Record<string, PostWithContent[]> = {
		Today: [],
		Yesterday: [],
		"This Week": [],
		Older: [],
	};

	posts.forEach((post) => {
		const createdAt = post.createdAt;
		if (createdAt >= todayStart) {
			groups.Today.push(post);
		} else if (createdAt >= yesterdayStart) {
			groups.Yesterday.push(post);
		} else if (createdAt >= weekStart) {
			groups["This Week"].push(post);
		} else {
			groups.Older.push(post);
		}
	});

	return Object.entries(groups)
		.filter(([, posts]) => posts.length > 0)
		.map(([label, posts]) => ({
			label,
			posts: posts.sort((a, b) => b.createdAt - a.createdAt),
		}));
}

export default function Posts() {
	const posts = useQuery(api.queries.posts.getOrganizationPosts);

	if (posts === undefined) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<p className="text-muted-foreground">Loading posts...</p>
			</div>
		);
	}

	// Group posts by date
	const groupedPosts = groupPostsByDate(posts);

	if (groupedPosts.length === 0) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<p className="text-muted-foreground">No posts found.</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden">
			{groupedPosts.map((group) => (
				<div key={group.label} className="flex flex-col gap-4">
					<h2 className="font-heading text-xl">{group.label}</h2>
					<div className="flex w-full flex-col items-center gap-4">
						{group.posts.map((post) => (
							<InstagramCard key={post._id} post={post} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
