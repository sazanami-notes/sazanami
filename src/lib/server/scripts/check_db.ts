import { db } from '../db/connection';
import { notes, noteLinks } from '../db/schema';

async function check() {
    try {
        const allNotes = await db.select().from(notes);
        console.log('--- Notes ---');
        allNotes.forEach(n => {
            console.log(`ID: ${n.id}, Title: ${n.title}, Slug: ${n.slug}, Status: ${n.status}, ResolvedLinks: ${n.resolvedLinks}`);
        });

        const allLinks = await db.select().from(noteLinks);
        console.log('--- Links ---');
        allLinks.forEach(l => {
            console.log(`Source: ${l.sourceNoteId}, Target: ${l.targetNoteId}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
