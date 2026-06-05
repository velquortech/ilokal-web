-- Branch approval flow: status + document uploads
-- Existing branches default to 'active' so nothing breaks

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending_review', 'active', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS branch_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'business_permit' | 'other_document'
  file_url     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_documents_branch_id ON branch_documents(branch_id);

-- RLS
ALTER TABLE branch_documents ENABLE ROW LEVEL SECURITY;

-- Business owners can insert documents for their own branches
CREATE POLICY "owner_insert_branch_documents" ON branch_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM branches b
      JOIN businesses biz ON biz.id = b.business_id
      WHERE b.id = branch_documents.branch_id
        AND biz.owner_id = auth.uid()
    )
  );

-- Business owners can view their own branch documents
CREATE POLICY "owner_select_branch_documents" ON branch_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM branches b
      JOIN businesses biz ON biz.id = b.business_id
      WHERE b.id = branch_documents.branch_id
        AND biz.owner_id = auth.uid()
    )
  );

-- Admins can view all branch documents
CREATE POLICY "admin_select_branch_documents" ON branch_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update branch status
CREATE POLICY "admin_update_branch_status" ON branches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket for branch documents (created via Supabase dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branch-documents', 'branch-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated owners to upload branch documents
CREATE POLICY "owner_upload_branch_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branch-documents');

CREATE POLICY "owner_read_branch_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'branch-documents');
