CREATE TABLE `usage` (
	`key` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`month` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_usage_business_month` ON `usage` (`business_id`,`month`);--> statement-breakpoint
DROP INDEX `idx_events_unique`;--> statement-breakpoint
ALTER TABLE `events` ADD `day` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_unique` ON `events` (`form_id`,`visitor`,`kind`,`day`);--> statement-breakpoint
CREATE TRIGGER submissions_increment_usage AFTER INSERT ON submissions
BEGIN
  INSERT INTO usage(key,business_id,month,count)
  VALUES (NEW.business_id || ':' || substr(NEW.created_at,1,7),NEW.business_id,substr(NEW.created_at,1,7),1)
  ON CONFLICT(key) DO UPDATE SET count=count+1;
END;
