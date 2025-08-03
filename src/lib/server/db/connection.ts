import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

// Create a client for the database
const client = createClient({
  url: env.DATABASE_URL!
});

// Initialize Drizzle ORM with the client
export const db = drizzle(client);