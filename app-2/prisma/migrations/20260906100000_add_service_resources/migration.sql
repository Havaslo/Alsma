CREATE TABLE "service_resources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "total_units" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "service_resources_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "service_variant_resources" (
  "variant_id" UUID NOT NULL,
  "resource_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "service_variant_resources_pkey" PRIMARY KEY ("variant_id", "resource_id"),
  CONSTRAINT "service_variant_resources_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "service_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_variant_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "service_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "service_variant_resources_resource_id_idx" ON "service_variant_resources"("resource_id");
