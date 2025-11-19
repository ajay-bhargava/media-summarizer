import { useState } from "react";
import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import type { Route } from "./+types/_index";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "PS15 Social Media System" },
		{
			name: "description",
			content: "Welcome to the PS15 Social Media System!",
		},
	];
}

export default function Home() {
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

	// When not authenticated, show login form
	if (!session) {
		return (
			<div className="container mx-auto max-w-2xl p-8">
				<Card className="mb-8">
					<CardHeader>
						<CardTitle>PS15 Social Media System</CardTitle>
						<CardDescription>
							Sign in to your account or create a new one
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isPending ? (
							<p className="text-muted-foreground">
								Checking authentication...
							</p>
						) : (
							<div>
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

	// When authenticated, redirect to dashboard
	return <Navigate to="/dashboard" replace />;
}
