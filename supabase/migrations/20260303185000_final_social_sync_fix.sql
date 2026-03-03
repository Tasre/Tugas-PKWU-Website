-- FINAL HARD RESET: Fix Social Counter Duplication
-- This script removes the duplicate triggers identified in the remote_schema.sql baseline.

-- 1. DROP ALL DUPLICATE TRIGGERS FOR POST LIKES
DROP TRIGGER IF EXISTS "on_post_like_change" ON "public"."post_likes";
DROP TRIGGER IF EXISTS "on_post_like_sync" ON "public"."post_likes";
DROP TRIGGER IF EXISTS "update_post_likes_count_trigger" ON "public"."post_likes";

-- 2. DROP ALL DUPLICATE TRIGGERS FOR POST DISLIKES
DROP TRIGGER IF EXISTS "on_post_dislike_change" ON "public"."post_dislikes";
DROP TRIGGER IF EXISTS "on_post_dislike_sync" ON "public"."post_dislikes";
DROP TRIGGER IF EXISTS "update_post_dislikes_count_trigger" ON "public"."post_dislikes";

-- 3. ESTABLISH SINGLE DEFINITIVE FUNCTIONS
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_post_dislikes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATTACH THE SINGLE SOURCE OF TRUTH TRIGGERS
CREATE TRIGGER on_post_like_sync_final
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE TRIGGER on_post_dislike_sync_final
  AFTER INSERT OR DELETE ON public.post_dislikes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_dislikes_count();

-- 5. INITIAL DATA CORRECTION: Fix any existing double-counts
UPDATE public.posts p
SET 
  likes_count = (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id),
  dislikes_count = (SELECT count(*) FROM public.post_dislikes d WHERE d.post_id = p.id);
