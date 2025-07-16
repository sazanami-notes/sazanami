import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { createDb } from "./db"; 

export const auth = (d1: D1Database) => {
    const db = createDb(d1);
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "sqlite", 
        }),
        emailAndPassword: {
            enabled: true,
        },
    });
};