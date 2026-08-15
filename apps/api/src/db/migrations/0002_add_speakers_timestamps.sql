ALTER TABLE "speakers" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "speakers" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;