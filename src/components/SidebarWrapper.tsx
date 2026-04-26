"use client";

import { api } from "@/app/_trpc/client";
import { Sidebar } from "./Sidebar";
import { signOut } from "next-auth/react";

export function SidebarWrapper() {
  const { data: user } = api.auth.getMe.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const handleSignOut = () => {
    signOut();
  };

  return (
    <Sidebar
      user={user}
      onSignOut={user ? handleSignOut : undefined}
    />
  );
}
