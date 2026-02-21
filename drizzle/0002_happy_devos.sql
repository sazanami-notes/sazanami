ALTER TABLE `user_settings` ADD `username` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_username_unique` ON `user_settings` (`username`);