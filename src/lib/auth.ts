import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { db } from "./server/db";

export const auth = betterAuth({
        database: drizzleAdapter(db, { provider: "sqlite" }),
        emailAndPassword: { enabled: true },
});

