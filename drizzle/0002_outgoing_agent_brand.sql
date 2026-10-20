CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`invite_hash` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_email` ON `members` (`business_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_members_user` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `routing_counters` (
	`form_id` text PRIMARY KEY NOT NULL,
	`counter` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `submissions` ADD `assigned_to` text;