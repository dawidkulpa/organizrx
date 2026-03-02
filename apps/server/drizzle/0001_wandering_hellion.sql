ALTER TABLE `users` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_backup_codes` text;