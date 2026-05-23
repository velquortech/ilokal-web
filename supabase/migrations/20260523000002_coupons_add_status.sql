-- Add publish/draft visibility status to coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('published', 'draft'));

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons (business_id, status)
  WHERE archived_at IS NULL;
