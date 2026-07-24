UPDATE "admin_roles"
SET "permissions" = array_append("permissions", 'site.access')
WHERE "permissions" @> ARRAY['site.manage']::TEXT[]
  AND NOT "permissions" @> ARRAY['site.access']::TEXT[];

UPDATE "admin_roles"
SET "permissions" = array_append("permissions", 'knowledge.access')
WHERE "permissions" @> ARRAY['knowledge.manage']::TEXT[]
  AND NOT "permissions" @> ARRAY['knowledge.access']::TEXT[];

UPDATE "admin_users"
SET "permission_overrides" = "permission_overrides" ||
  jsonb_build_object('site.access', "permission_overrides" -> 'site.manage')
WHERE "permission_overrides" ? 'site.manage'
  AND NOT "permission_overrides" ? 'site.access';

UPDATE "admin_users"
SET "permission_overrides" = "permission_overrides" ||
  jsonb_build_object(
    'knowledge.access',
    "permission_overrides" -> 'knowledge.manage'
  )
WHERE "permission_overrides" ? 'knowledge.manage'
  AND NOT "permission_overrides" ? 'knowledge.access';
