ALTER TABLE "summaries"
ADD COLUMN "topic_type" TEXT,
ADD COLUMN "topic_title" TEXT,
ADD COLUMN "topic_order" INTEGER;

CREATE INDEX "summaries_publication_id_topic_type_idx"
ON "summaries"("publication_id", "topic_type");

CREATE INDEX "summaries_publication_id_topic_order_idx"
ON "summaries"("publication_id", "topic_order");
