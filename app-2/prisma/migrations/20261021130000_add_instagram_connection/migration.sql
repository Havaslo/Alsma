CREATE TABLE "instagram_oauth_states" (
    "id" UUID NOT NULL,
    "state_hash" VARCHAR(64) NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "return_origin" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instagram_channel_connections" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'instagram',
    "instagram_user_id" VARCHAR(80) NOT NULL,
    "username" VARCHAR(120) NOT NULL,
    "facebook_page_id" VARCHAR(80) NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMPTZ(3),
    "connected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_channel_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instagram_oauth_states_state_hash_key" ON "instagram_oauth_states"("state_hash");
CREATE INDEX "instagram_oauth_states_expires_at_idx" ON "instagram_oauth_states"("expires_at");
CREATE UNIQUE INDEX "instagram_channel_connections_provider_key" ON "instagram_channel_connections"("provider");
