CREATE TABLE "service_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "page_slug" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "subheading" TEXT,
  "block_number" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_sections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_sections_page_slug_block_number_idx" ON "service_sections"("page_slug", "block_number");
ALTER TABLE "services" ADD COLUMN "section_id" UUID;
ALTER TABLE "services" ADD CONSTRAINT "services_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "service_sections"("id") ON DELETE SET NULL;
CREATE INDEX "services_section_id_idx" ON "services"("section_id");
