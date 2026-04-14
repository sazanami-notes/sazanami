ALTER TABLE `notes` ADD `content_html` text;
--> statement-breakpoint
ALTER TABLE `notes` ADD `content_bin` blob;
--> statement-breakpoint
UPDATE `notes` SET `content_html` = `content`;
--> statement-breakpoint
ALTER TABLE `notes` DROP COLUMN `content`;
