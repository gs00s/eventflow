CREATE TABLE "speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"image" text NOT NULL
);
