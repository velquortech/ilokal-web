-- Business posts — the content behind the mobile "Updates" tab.
--
-- A business publishes short posts (announcement, new item, promo blurb); the
-- mobile Updates feed shows posts from businesses the user follows (the
-- `follows` table). Read visibility mirrors the businesses "public view
-- verified" rule; writes are owner-/admin-only (the web dashboard will create
-- posts — there is no mobile write path).

CREATE TABLE public.business_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Feed query is "posts for these business_ids, newest first" — one composite
-- index serves the filter, sort, and limit together.
CREATE INDEX idx_business_posts_business_published
  ON public.business_posts (business_id, published_at DESC);

-- RLS
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

-- Public read: non-archived posts of verified, non-archived businesses
-- (same gate as the businesses "Public view verified businesses" policy).
CREATE POLICY "Public view posts of verified businesses"
ON public.business_posts FOR SELECT
USING (
  archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_posts.business_id
      AND b.status = 'verified'
      AND b.archived_at IS NULL
  )
);

-- Owners manage posts for their own business.
CREATE POLICY "Owners manage own business posts"
ON public.business_posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_posts.business_id
      AND b.owner_id = auth.uid()
  )
);

-- Admins manage all posts.
CREATE POLICY "Admins manage all posts"
ON public.business_posts FOR ALL
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Keep updated_at fresh.
CREATE TRIGGER on_update_business_posts
BEFORE UPDATE ON public.business_posts
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
