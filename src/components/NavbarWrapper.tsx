import { auth, signOut } from "@/auth";
import { Navbar } from "./Navbar";

export async function NavbarWrapper() {
    const session = await auth();

    const handleSignOut = async () => {
        "use server";
        await signOut();
    };

    return (
        <Navbar
            user={session?.user}
            onSignOut={session?.user ? handleSignOut : undefined}
        />
    );
}
