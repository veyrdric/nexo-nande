CREATE TABLE "editors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED,
	"content_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"summary" text NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"office" jsonb,
	"source_url" text NOT NULL,
	"captured_at" date NOT NULL,
	"valid_until" date,
	"status" varchar(20) DEFAULT 'pending_review' NOT NULL,
	"is_fictional" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_documents_code_unique" UNIQUE("code"),
	CONSTRAINT "knowledge_documents_status_check" CHECK ("knowledge_documents"."status" IN ('pending_review', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_reviewed_by_editors_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."editors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_knowledge_chunks_document" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_knowledge_chunks_content_hash" ON "knowledge_chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_knowledge_chunks_embedding_hnsw" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_knowledge_chunks_fts" ON "knowledge_chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_status" ON "knowledge_documents" USING btree ("status");