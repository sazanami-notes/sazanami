CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text,
	`bio` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_username_unique` ON `user_profiles` (`username`);