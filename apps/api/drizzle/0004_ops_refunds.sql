ALTER TABLE "refunds" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "created_by_ops" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refund_actor" CHECK (("refunds"."created_by_user_id" IS NULL) <> ("refunds"."created_by_ops" IS NULL));