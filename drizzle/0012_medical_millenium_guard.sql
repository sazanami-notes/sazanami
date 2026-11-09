CREATE INDEX `attachments_user_created_idx` ON `attachments` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `note_attachments_note_idx` ON `note_attachments` (`note_id`);--> statement-breakpoint
CREATE INDEX `note_attachments_attachment_idx` ON `note_attachments` (`attachment_id`);--> statement-breakpoint
CREATE INDEX `note_links_source_idx` ON `note_links` (`source_note_id`);--> statement-breakpoint
CREATE INDEX `note_links_target_idx` ON `note_links` (`target_note_id`);--> statement-breakpoint
CREATE INDEX `note_tags_note_idx` ON `note_tags` (`note_id`);--> statement-breakpoint
CREATE INDEX `note_tags_tag_idx` ON `note_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `notes_user_status_updated_idx` ON `notes` (`user_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `notes_user_updated_idx` ON `notes` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `notes_user_public_status_idx` ON `notes` (`user_id`,`is_public`,`status`);--> statement-breakpoint
CREATE INDEX `notes_parent_idx` ON `notes` (`parent_id`);--> statement-breakpoint
CREATE INDEX `timeline_user_created_idx` ON `timeline` (`user_id`,`created_at`);