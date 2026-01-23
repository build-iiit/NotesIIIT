import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Notes Platform</h1>

      {session?.user ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl">Welcome, {session.user.name}!</p>
          <img
            src={session.user.image ?? ""}
            alt="Profile"
            className="w-16 h-16 rounded-full"
          />
          <div className="flex gap-4">
            <a href="/upload" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Upload Note
            </a>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p>You shouldn't see this (Middleware should redirect)</p>
      )}
    </div>
  );
}
