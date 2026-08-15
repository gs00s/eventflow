CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"speaker_id" uuid NOT NULL,
	"title" text NOT NULL,
	"from" timestamp NOT NULL,
	"to" timestamp NOT NULL,
	"description" text NOT NULL,
	"level" text NOT NULL,
	"track" text NOT NULL,
	"room" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"description" text NOT NULL,
	"hero_image" text NOT NULL,
	"hero_cta" text NOT NULL,
	"date" date NOT NULL,
	"location_city" text NOT NULL,
	"location_venue" text NOT NULL,
	"location_address" text NOT NULL,
	"organizer_name" text NOT NULL,
	"organizer_image" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_event_id_idx" ON "sessions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sessions_speaker_id_idx" ON "sessions" USING btree ("speaker_id");