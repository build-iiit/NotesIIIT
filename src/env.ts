import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
