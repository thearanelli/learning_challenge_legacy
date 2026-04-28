CREATE TABLE IF NOT EXISTS receipts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid,
  youth_id uuid references youth(id),
  first_name text,
  last_name text,
  file_url text not null,
  uploaded_at timestamptz default now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on receipts"
  ON receipts FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT DO NOTHING;
