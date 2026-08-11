CREATE TABLE `datasetRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`datasetId` int NOT NULL,
	`rowIndex` int NOT NULL,
	`dataJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `datasetRows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reports` ADD `storageKey` varchar(1024) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `reports` ADD `storageUrl` varchar(2048) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `reports` ADD `fileName` varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `reports` ADD `mimeType` varchar(120) NOT NULL DEFAULT 'text/html';