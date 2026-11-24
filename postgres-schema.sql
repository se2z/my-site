-- Server-only tables. The application connection owns these tables and is
-- scoped to this project; no browser receives a database credential.
CREATE TABLE IF NOT EXISTS myagko_records(key text PRIMARY KEY,value text NOT NULL);
CREATE TABLE IF NOT EXISTS myagko_orders(id text PRIMARY KEY,idem text UNIQUE NOT NULL,token_hash text UNIQUE NOT NULL,data text NOT NULL);
CREATE TABLE IF NOT EXISTS myagko_photos(id text PRIMARY KEY,draft_hash text NOT NULL,mime text NOT NULL,data text NOT NULL,created_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS myagko_photos_draft ON myagko_photos(draft_hash);
ALTER TABLE myagko_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE myagko_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE myagko_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON myagko_records,myagko_orders,myagko_photos FROM PUBLIC;
-- No public/anon RLS policies: only the server's table-owning role can access.
