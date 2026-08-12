CREATE TABLE `aiAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`defectId` int,
	`kind` varchar(64) NOT NULL,
	`content` json NOT NULL,
	`confidence` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor` varchar(128) NOT NULL,
	`action` varchar(128) NOT NULL,
	`resource` varchar(255) NOT NULL,
	`metadata` json,
	`ipDevice` varchar(255) NOT NULL DEFAULT 'Demo browser · 127.0.0.1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `defectComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectId` int NOT NULL,
	`author` varchar(128) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `defectComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `defects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`key` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`reproductionSteps` text,
	`expectedBehavior` text,
	`actualBehavior` text,
	`environment` varchar(64) NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`priority` enum('critical','high','medium','low') NOT NULL,
	`status` enum('open','in_progress','resolved','reopened','closed') NOT NULL DEFAULT 'open',
	`assignee` varchar(128),
	`evidenceUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `defects_id` PRIMARY KEY(`id`),
	CONSTRAINT `defects_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `environments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`type` enum('development','staging','production') NOT NULL,
	`url` varchar(512),
	`status` enum('healthy','degraded','offline') NOT NULL DEFAULT 'healthy',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `environments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`level` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelineRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineId` int NOT NULL,
	`projectId` int NOT NULL,
	`commit` varchar(16) NOT NULL,
	`branch` varchar(128) NOT NULL,
	`status` enum('passed','failed','running','warning') NOT NULL,
	`qualityGate` enum('ready','blocked','warning') NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`stages` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipelineRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`branch` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`status` enum('active','at_risk','archived') NOT NULL DEFAULT 'active',
	`owner` varchar(128) NOT NULL,
	`stack` json NOT NULL,
	`qualityScore` int NOT NULL DEFAULT 0,
	`lastDeploymentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `releases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`version` varchar(64) NOT NULL,
	`environment` varchar(64) NOT NULL,
	`status` enum('ready','blocked','warning','released') NOT NULL,
	`score` int NOT NULL,
	`summary` text NOT NULL,
	`releasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `releases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`url` varchar(512) NOT NULL,
	`branch` varchar(128) NOT NULL DEFAULT 'main',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `repositories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(32) NOT NULL,
	`label` varchar(64) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` varchar(64) NOT NULL,
	`avatarTone` varchar(24) NOT NULL DEFAULT 'cyan',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`suiteId` int,
	`key` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`preconditions` text,
	`steps` json NOT NULL,
	`expectedResult` text,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('ready','draft','deprecated') NOT NULL DEFAULT 'ready',
	`testType` enum('unit','api','ui','integration','e2e','regression','smoke','performance') NOT NULL,
	`environment` varchar(64) NOT NULL,
	`automationStatus` enum('automated','manual','planned') NOT NULL DEFAULT 'automated',
	`tags` json NOT NULL,
	`owner` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testCases_id` PRIMARY KEY(`id`),
	CONSTRAINT `testCases_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `testExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`suiteId` int,
	`name` varchar(128) NOT NULL,
	`environment` varchar(64) NOT NULL,
	`status` enum('passed','failed','running','cancelled') NOT NULL,
	`totalTests` int NOT NULL DEFAULT 0,
	`passedTests` int NOT NULL DEFAULT 0,
	`failedTests` int NOT NULL DEFAULT 0,
	`skippedTests` int NOT NULL DEFAULT 0,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `testExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`executionId` int NOT NULL,
	`testCaseId` int,
	`status` enum('passed','failed','skipped') NOT NULL,
	`durationMs` int NOT NULL DEFAULT 0,
	`failureMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `testResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testSuites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` varchar(32) NOT NULL,
	`environment` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `testSuites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','manager','developer','qa','user') NOT NULL DEFAULT 'qa',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `aiAnalyses` ADD CONSTRAINT `aiAnalyses_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aiAnalyses` ADD CONSTRAINT `aiAnalyses_defectId_defects_id_fk` FOREIGN KEY (`defectId`) REFERENCES `defects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defectComments` ADD CONSTRAINT `defectComments_defectId_defects_id_fk` FOREIGN KEY (`defectId`) REFERENCES `defects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defects` ADD CONSTRAINT `defects_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `environments` ADD CONSTRAINT `environments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipelineRuns` ADD CONSTRAINT `pipelineRuns_pipelineId_pipelines_id_fk` FOREIGN KEY (`pipelineId`) REFERENCES `pipelines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipelineRuns` ADD CONSTRAINT `pipelineRuns_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipelines` ADD CONSTRAINT `pipelines_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `releases` ADD CONSTRAINT `releases_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repositories` ADD CONSTRAINT `repositories_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMembers` ADD CONSTRAINT `teamMembers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testCases` ADD CONSTRAINT `testCases_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testCases` ADD CONSTRAINT `testCases_suiteId_testSuites_id_fk` FOREIGN KEY (`suiteId`) REFERENCES `testSuites`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testExecutions` ADD CONSTRAINT `testExecutions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testExecutions` ADD CONSTRAINT `testExecutions_suiteId_testSuites_id_fk` FOREIGN KEY (`suiteId`) REFERENCES `testSuites`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_executionId_testExecutions_id_fk` FOREIGN KEY (`executionId`) REFERENCES `testExecutions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_testCaseId_testCases_id_fk` FOREIGN KEY (`testCaseId`) REFERENCES `testCases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testSuites` ADD CONSTRAINT `testSuites_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_analyses_project_idx` ON `aiAnalyses` (`projectId`);--> statement-breakpoint
CREATE INDEX `ai_analyses_defect_idx` ON `aiAnalyses` (`defectId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `defect_comments_defect_idx` ON `defectComments` (`defectId`);--> statement-breakpoint
CREATE INDEX `defects_project_idx` ON `defects` (`projectId`);--> statement-breakpoint
CREATE INDEX `defects_severity_idx` ON `defects` (`severity`);--> statement-breakpoint
CREATE INDEX `defects_status_idx` ON `defects` (`status`);--> statement-breakpoint
CREATE INDEX `environments_project_idx` ON `environments` (`projectId`);--> statement-breakpoint
CREATE INDEX `pipeline_runs_project_idx` ON `pipelineRuns` (`projectId`);--> statement-breakpoint
CREATE INDEX `pipeline_runs_status_idx` ON `pipelineRuns` (`status`);--> statement-breakpoint
CREATE INDEX `pipelines_project_idx` ON `pipelines` (`projectId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `releases_project_idx` ON `releases` (`projectId`);--> statement-breakpoint
CREATE INDEX `releases_status_idx` ON `releases` (`status`);--> statement-breakpoint
CREATE INDEX `repositories_project_idx` ON `repositories` (`projectId`);--> statement-breakpoint
CREATE INDEX `team_members_project_idx` ON `teamMembers` (`projectId`);--> statement-breakpoint
CREATE INDEX `test_cases_project_idx` ON `testCases` (`projectId`);--> statement-breakpoint
CREATE INDEX `test_cases_type_idx` ON `testCases` (`testType`);--> statement-breakpoint
CREATE INDEX `test_cases_status_idx` ON `testCases` (`status`);--> statement-breakpoint
CREATE INDEX `test_executions_project_idx` ON `testExecutions` (`projectId`);--> statement-breakpoint
CREATE INDEX `test_executions_status_idx` ON `testExecutions` (`status`);--> statement-breakpoint
CREATE INDEX `test_results_execution_idx` ON `testResults` (`executionId`);--> statement-breakpoint
CREATE INDEX `test_suites_project_idx` ON `testSuites` (`projectId`);