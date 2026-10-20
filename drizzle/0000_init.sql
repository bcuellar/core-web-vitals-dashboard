CREATE TABLE `sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_url_unique` ON `sites` (`url`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` integer NOT NULL,
	`strategy` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`performance_score` real,
	`accessibility_score` real,
	`best_practices_score` real,
	`seo_score` real,
	`field_source` text,
	`field_lcp` real,
	`field_inp` real,
	`field_cls` real,
	`field_fcp` real,
	`field_ttfb` real,
	`lab_lcp` real,
	`lab_cls` real,
	`lab_tbt` real,
	`lab_fcp` real,
	`lab_speed_index` real,
	`lab_ttfb` real,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `snapshots_site_strategy_fetched_idx` ON `snapshots` (`site_id`,`strategy`,`fetched_at`);