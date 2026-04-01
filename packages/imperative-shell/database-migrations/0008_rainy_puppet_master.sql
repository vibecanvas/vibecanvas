DROP INDEX IF EXISTS `files_hash_unique`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `files_hash_idx` ON `files` (`hash`);
