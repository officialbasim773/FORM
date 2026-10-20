CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`accent` text DEFAULT '#176650' NOT NULL,
	`button` text DEFAULT '#176650' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`onboarded` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_owner_unique` ON `businesses` (`owner`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`form_id` text NOT NULL,
	`visitor` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_unique` ON `events` (`form_id`,`visitor`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_events_business_date` ON `events` (`business_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`slug` text NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_slug_unique` ON `forms` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_forms_business` ON `forms` (`business_id`,`deleted`);--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`form_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`receipt` text NOT NULL,
	`idempotency` text NOT NULL,
	`payload_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`customer` text NOT NULL,
	`summary` text NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`handoff_at` text,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submission_idempotency` ON `submissions` (`form_id`,`idempotency`);--> statement-breakpoint
CREATE INDEX `idx_submissions_business_date` ON `submissions` (`business_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_submissions_form` ON `submissions` (`form_id`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_business` ON `uploads` (`business_id`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_versions_form_number` ON `versions` (`form_id`,`version`);