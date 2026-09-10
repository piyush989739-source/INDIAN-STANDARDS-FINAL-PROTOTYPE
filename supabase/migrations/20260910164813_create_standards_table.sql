/*
# Create standards table for IS Standards Finder

1. New Tables
- `standards`
  - `id` (uuid, primary key)
  - `standard_number` (text, not null) — e.g. "IS 1786", "IS 456"
  - `title` (text, not null) — full title of the standard
  - `category` (text) — broad category, e.g. "Construction", "Steel"
  - `product_type` (text) — e.g. "TMT Bars", "Cement"
  - `keywords` (text[]) — array of keywords for matching
  - `scope_summary` (text) — short description of the standard's scope
  - `source_link` (text) — URL to the BIS page or publication
  - `revision_year` (integer) — year of last revision
  - `status` (text, default 'active') — active/superseded/withdrawn
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `standards`.
- Allow anon + authenticated CRUD because this is a single-tenant app with no sign-in.
3. Indexes
- GIN index on `keywords` for fast array-based searching.
- GIN index on `product_type` for text search.
- B-tree index on `standard_number` for exact lookups.
*/

CREATE TABLE IF NOT EXISTS standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_number text NOT NULL,
  title text NOT NULL,
  category text,
  product_type text,
  keywords text[] DEFAULT '{}',
  scope_summary text,
  source_link text,
  revision_year integer,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE standards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_standards" ON standards;
CREATE POLICY "anon_select_standards" ON standards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_standards" ON standards;
CREATE POLICY "anon_insert_standards" ON standards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_standards" ON standards;
CREATE POLICY "anon_update_standards" ON standards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_standards" ON standards;
CREATE POLICY "anon_delete_standards" ON standards FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS standards_keywords_gin ON standards USING GIN (keywords);
CREATE INDEX IF NOT EXISTS standards_product_type_gin ON standards USING GIN (to_tsvector('english', coalesce(product_type, '')));
CREATE INDEX IF NOT EXISTS standards_title_gin ON standards USING GIN (to_tsvector('english', coalesce(title, '')));
CREATE INDEX IF NOT EXISTS standards_standard_number_idx ON standards (standard_number);
