"use client";

import { useState } from"react";
import { useRouter } from"next/navigation";
import { BookOpen } from"lucide-react";
import { api } from"@/app/_trpc/client";

export default function RegisterPage() {
 const router = useRouter();
 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState("");
 const registerMutation = api.auth.register.useMutation({
 onSuccess: () => {
 router.push("/login?registered=true");
 },
 onError: (err) => {
 setError(err.message ||"Something went wrong");
 }
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");

 if (!name || !email || !password) {
 setError("Please fill in all fields.");
 return;
 }

 if (password.length < 6) {
 setError("Password must be at least 6 characters.");
 return;
 }

 registerMutation.mutate({ name, email, password });
 };

 return (
 <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
 <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
 <div className="bg-primary/10 p-5 rounded-full mb-4">
 <BookOpen className="h-10 w-10 text-primary" />
 </div>
 <h1 className="text-center text-4xl font-extrabold text-primary tracking-tight">
 Create Account
 </h1>
 <p className="mt-2 text-center text-muted-foreground">
 Join NotesIIIT to start sharing and collaborating.
 </p>
 </div>

 <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
 <div className="bg-card border border-border py-8 px-4 sm:rounded-2xl sm:px-12">
 <form onSubmit={handleSubmit} className="space-y-4">
 {error && (
 <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
 {error}
 </div>
 )}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1">Name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
 placeholder="Your name"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-foreground mb-1">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
 placeholder="you@example.com"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-foreground mb-1">Password</label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 minLength={6}
 className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
 placeholder="Min. 6 characters"
 />
 </div>
 <button
 type="submit"
 disabled={registerMutation.isPending}
 className="w-full py-3 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50"
 >
 {registerMutation.isPending ?"Creating..." :"Create Account"}
 </button>
 </form>

 <p className="mt-6 text-center text-sm text-muted-foreground">
 Already have an account?{""}
 <a href="/login" className="text-primary font-semibold hover:underline">
 Sign in
 </a>
 </p>
 </div>
 </div>
 </div>
 );
}
