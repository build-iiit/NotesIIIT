import { z } from"zod";

const envSchema = z.object({
 DATABASE_URL: z.string().url(),
 NODE_ENV: z.enum(["development","test","production"]).default("development"),
 NEXTAUTH_SECRET: z.string().optional(),
 NEXTAUTH_URL: z.string().url().optional(),
});

const isSkip = process.env.SKIP_ENV_VALIDATION === "1" || process.env.SKIP_ENV_VALIDATION === "true";

export const env = isSkip
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : envSchema.parse(process.env);
