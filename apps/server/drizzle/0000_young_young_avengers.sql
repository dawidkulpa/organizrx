CREATE TABLE `BOOKMARK-categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order` integer,
	`category` text,
	`category_id` integer,
	`default` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `BOOKMARK-categories_category_unique` ON `BOOKMARK-categories` (`category`);--> statement-breakpoint
CREATE TABLE `BOOKMARK-tabs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order` integer,
	`category_id` integer,
	`name` text,
	`url` text,
	`enabled` integer,
	`group_id` integer,
	`image` text,
	`background_color` text,
	`text_color` text
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order` integer,
	`category` text,
	`category_id` integer,
	`image` text,
	`default` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_category_unique` ON `categories` (`category`);--> statement-breakpoint
CREATE TABLE `chatroom` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text,
	`gravatar` text,
	`uid` text,
	`date` text,
	`ip` text,
	`message` text
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group` text,
	`group_id` integer,
	`image` text,
	`default` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_group_unique` ON `groups` (`group`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text,
	`date` text,
	`email` text,
	`username` text,
	`dateused` text,
	`usedby` text,
	`ip` text,
	`valid` text,
	`type` text,
	`invitedby` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_unique` ON `invites` (`code`);--> statement-breakpoint
CREATE TABLE `options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`value` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `options_name_unique` ON `options` (`name`);--> statement-breakpoint
CREATE TABLE `tabs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order` integer,
	`category_id` integer,
	`name` text,
	`url` text,
	`url_local` text,
	`default` integer,
	`enabled` integer,
	`group_id` integer,
	`group_id_max` integer DEFAULT 0,
	`add_to_admin` integer DEFAULT 0,
	`image` text,
	`type` integer,
	`splash` integer,
	`ping` integer,
	`ping_url` text,
	`timeout` integer,
	`timeout_ms` integer,
	`preload` integer
);
--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text,
	`user_id` integer,
	`browser` text,
	`ip` text,
	`created` text,
	`expires` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_token_unique` ON `tokens` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text,
	`password` text,
	`email` text,
	`plex_token` text,
	`group` text,
	`group_id` integer,
	`locked` integer,
	`image` text,
	`register_date` text,
	`auth_service` text DEFAULT 'internal'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);