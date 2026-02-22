CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`primary_color` text,
	`secondary_color` text,
	`accent_color` text,
	`background_color` text,
	`text_color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `theme_mode` text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `light_theme_id` text DEFAULT 'sazanami-days' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `dark_theme_id` text DEFAULT 'sazanami-night' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `theme`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `primary_color`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `secondary_color`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `accent_color`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `background_color`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `text_color`;