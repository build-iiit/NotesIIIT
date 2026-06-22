import { signIn } from"@/auth"
import { BookOpen, Github } from"lucide-react"
import Link from"next/link"

export default function SignIn({ searchParams }: { searchParams: { registered?: string } }) {
 return (
 <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
 <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
 <div className="bg-primary/10 p-5 rounded-full mb-4">
 <BookOpen className="h-10 w-10 text-primary" />
 </div>
 <h1 className="text-center text-5xl font-extrabold text-primary tracking-tight">
 NotesIIIT
 </h1>
 <p className="mt-2 text-center text-lg text-muted-foreground font-medium">
 Share notes, collaborate, and excel.
 </p>
 </div>

 <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
 <div className="bg-card border border-border py-8 px-4 shadow-sm sm:rounded-2xl sm:px-12">
 {searchParams.registered && (
 <div className="mb-6 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium text-center">
 Registration successful! Please sign in below.
 </div>
 )}
 
 <div className="flex flex-col items-center justify-center space-y-4">
 <h2 className="text-xl font-semibold text-foreground mb-2">Sign in to your account</h2>

 {/* Credentials Sign In Form */}
 <form
 className="w-full space-y-4"
 action={async (formData) => {
"use server"
 await signIn("credentials", formData)
 }}
 >
 <div>
 <input
 name="email"
 type="email"
 placeholder="Email"
 required
 className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
 />
 </div>
 <div>
 <input
 name="password"
 type="password"
 placeholder="Password"
 required
 className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all"
 />
 </div>
 <button
 type="submit"
 className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 active:scale-95"
 >
 Sign in with Email
 </button>
 </form>

 <div className="relative w-full my-4">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border" />
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
 </div>
 </div>

 {/* GitHub Sign In */}
 <form
 className="w-full"
 action={async () => {
"use server"
 await signIn("github", { redirectTo:"/" })
 }}
 >
 <button
 type="submit"
 className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold rounded-lg bg-foreground text-background hover:opacity-90 transition-all duration-200 active:scale-95 gap-2"
 >
 <Github className="h-5 w-5" />
 <span>Sign in with GitHub</span>
 </button>
 </form>

 {/* Google Sign In */}
 <form
 className="w-full"
 action={async () => {
"use server"
 await signIn("google", { redirectTo:"/" })
 }}
 >
 <button
 type="submit"
 className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold rounded-lg bg-secondary text-foreground border border-border hover:bg-accent transition-all duration-200 active:scale-95 gap-2"
 >
 <svg className="w-5 h-5" viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
 <path fill="none" d="M1 1h22v22H1z" />
 </svg>
 <span>Sign in with Google</span>
 </button>
 </form>

 <p className="mt-4 text-center text-sm text-muted-foreground w-full">
 Don&apos;t have an account?{""}
 <a href="/register" className="text-primary font-semibold hover:underline">
 Register here
 </a>
 </p>
 </div>
 </div>
 <p className="mt-6 text-center text-xs text-muted-foreground">
 &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
 </p>
 </div>
 </div>
 )
}
