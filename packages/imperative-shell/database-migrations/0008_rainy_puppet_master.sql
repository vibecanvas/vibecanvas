DROP INDEX `files_hash_unique`;--> statement-breakpoint
CREATE INDEX `files_hash_idx` ON `files` (`hash`);