import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { db } from "./server/db";
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$env/static/private';

export const auth = betterAuth({
        database: drizzleAdapter(db, { provider: "sqlite" }),
        secret: BETTER_AUTH_SECRET || "O5mYuDUIfa4su4GeYWz49Y52pv7capK9",
        baseURL: BETTER_AUTH_URL || "http://localhost:8788",
        emailAndPassword: { enabled: true },
});

