import { api } from "@socialmedia/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";
import type { Route } from "./+types/_index";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Social Media App" },
		{ name: "description", content: "Welcome to the Social Media App!" },
	];
}

export default function Home() {
	const _health = useQuery(api.queries.healthCheck.get);
	const { data: session, isPending } = useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [isSignUp, setIsSignUp] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			if (isSignUp) {
				await signUp.email({ email, password, name });
			} else {
				await signIn.email({ email, password });
			}
		} catch (error) {
			console.error("Auth error:", error);
			alert(error instanceof Error ? error.message : "Authentication failed");
		} finally {
			setLoading(false);
		}
	};

	const handleSignOut = async () => {
		await signOut();
	};

	return (
		<div className="container mx-auto max-w-2xl p-8">
			{/* Authentication Status */}
			<Card className="mb-8">
				<CardHeader>
					<CardTitle>2. Authentication Status</CardTitle>
				</CardHeader>
				<CardContent>
					{isPending ? (
						<p className="text-muted-foreground">Checking authentication...</p>
					) : session ? (
						<div>
							<p className="mb-2 font-medium text-green-600">✓ Authenticated</p>
							<p className="text-muted-foreground text-sm">
								User ID: {session.user?.id}
							</p>
							<p className="mb-4 text-muted-foreground text-sm">
								Email: {session.user?.email}
							</p>
							<Button
								type="button"
								onClick={handleSignOut}
								variant="default"
								className="border-red-600 bg-red-600 text-white hover:bg-red-700"
							>
								Sign Out
							</Button>
						</div>
					) : (
						<div>
							<p className="mb-4 font-medium text-orange-600">
								✗ Not Authenticated
							</p>
							<form onSubmit={handleAuth} className="space-y-3">
								{isSignUp && (
									<input
										type="text"
										placeholder="Name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										className="w-full rounded border px-3 py-2"
										required
									/>
								)}
								<input
									type="email"
									placeholder="Email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full rounded border px-3 py-2"
									required
								/>
								<input
									type="password"
									placeholder="Password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full rounded border px-3 py-2"
									required
								/>
								<Button
									type="submit"
									disabled={loading}
									className="w-full border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
								>
									{loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
								</Button>
								<Button
									type="button"
									onClick={() => setIsSignUp(!isSignUp)}
									variant="neutral"
									className="w-full border-transparent bg-transparent text-blue-600 shadow-none hover:underline"
								>
									{isSignUp
										? "Already have an account? Sign In"
										: "Need an account? Sign Up"}
								</Button>
							</form>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
