-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "doe_id" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pages" INTEGER NOT NULL,
    "file_size" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "image_url" TEXT,
    "is_supplement" BOOLEAN NOT NULL DEFAULT false,
    "raw_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "publications_doe_id_key" ON "publications"("doe_id");

-- CreateIndex
CREATE INDEX "publications_date_idx" ON "publications"("date");

-- CreateIndex
CREATE INDEX "publications_doe_id_idx" ON "publications"("doe_id");

-- CreateIndex
CREATE INDEX "summaries_publication_id_idx" ON "summaries"("publication_id");

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
