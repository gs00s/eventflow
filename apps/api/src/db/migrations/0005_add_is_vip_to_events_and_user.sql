ALTER TABLE "events" ADD COLUMN "is_vip" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_vip" boolean DEFAULT false NOT NULL;