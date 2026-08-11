ALTER TABLE `reports` MODIFY COLUMN `storageKey` varchar(1024) NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `storageUrl` varchar(2048) NOT NULL;