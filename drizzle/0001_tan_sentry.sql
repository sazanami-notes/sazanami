CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`font` text DEFAULT 'sans-serif' NOT NULL,
	`primary_color` text,
	`secondary_color` text,
	`accent_color` text,
	`background_color` text,
	`text_color` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
