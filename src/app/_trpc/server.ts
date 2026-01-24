import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCallerFactory, createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

// Create a stable getter for the caller with the current request context
const createContext = cache(async () => {
    const heads = new Headers(await headers());
    heads.set("x-trpc-source", "rsc");

    return createTRPCContext({
        headers: heads,
    });
});

export const api = createCallerFactory(appRouter)(createContext);
