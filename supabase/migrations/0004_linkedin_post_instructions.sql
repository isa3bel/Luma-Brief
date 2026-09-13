-- Free-text standing instructions for how the user wants every LinkedIn
-- draft written (tone, intro requirements, etc.) — lives on user_settings
-- alongside the other cross-feature preferences, not on
-- linkedin_connections, since it's about draft generation, not the OAuth
-- connection itself, and should survive a disconnect/reconnect.
alter table public.user_settings add column if not exists linkedin_post_instructions text;
