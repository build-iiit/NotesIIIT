"use client";

import { api } from "@/app/_trpc/client";
import { Navbar } from "./Navbar";
import { signOut } from "next-auth/react";

export function NavbarWrapper() {
    const { data: user } = api.auth.getMe.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const handleSignOut = () => {
        signOut();
    };

    return (
        <Navbar
            user={user}
            onSignOut={user ? handleSignOut : undefined}
        />
    );
}
