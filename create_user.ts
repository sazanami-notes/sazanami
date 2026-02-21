import { db } from './src/lib/server/db/connection';
import { user } from './src/lib/server/db/auth-schema';
import { ulid } from 'ulid';

async function main() {
    const id = ulid();
    await db.insert(user).values({
        id,
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    console.log('User created:', id);
    process.exit(0);
}

main();
