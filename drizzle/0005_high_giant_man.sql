ALTER TABLE `notes` ADD `last_encountered_at` integer;--> statement-breakpoint
ALTER TABLE `notes` ADD `encounter_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `encounter_boost` integer DEFAULT 0 NOT NULL;