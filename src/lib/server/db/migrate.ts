import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './migrate-connection';

async function main() {
    console.log('Running migrations...');
    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Migrations completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

main();
