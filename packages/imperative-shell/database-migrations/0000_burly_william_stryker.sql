CREATE TABLE `agent_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`session_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`type` text NOT NULL,
	`data` text,
	FOREIGN KEY (`canvas_id`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `automerge_repo_data` (
	`key` text PRIMARY KEY NOT NULL,
	`updated_at` text DEFAULT (datetime()) NOT NULL,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `automerge_keys` ON `automerge_repo_data` (`key`);--> statement-breakpoint
CREATE INDEX `automerge_updated_at` ON `automerge_repo_data` (`updated_at`);--> statement-breakpoint
CREATE TABLE `canvas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`automerge_url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canvas_name_unique` ON `canvas` (`name`);--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`title` text NOT NULL,
	`session_id` text,
	`harness` text NOT NULL,
	`local_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`canvas_id`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`format` text NOT NULL,
	`base64` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_hash_unique` ON `files` (`hash`);--> statement-breakpoint
CREATE TABLE `filetrees` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`is_collapsed` integer DEFAULT false NOT NULL,
	`angle` real DEFAULT 0 NOT NULL,
	`style` text DEFAULT '{}' NOT NULL,
	`group_ids` text DEFAULT '[]' NOT NULL,
	`bound_ids` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`version_nonce` integer DEFAULT 0 NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`glob_pattern` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`canvas_id`) REFERENCES `canvas`(`id`) ON UPDATE no action ON DELETE cascade
);
