CREATE TABLE `note_embeddings` (
	`note_id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`content_hash` text NOT NULL,
	`embedding` FLOAT32(1024) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `note_embeddings_vec_idx` ON `note_embeddings` (libsql_vector_idx(`embedding`));
