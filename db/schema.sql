-- LAMINAR database schema (PostgreSQL 15+)
--
-- STATUS: foundation for Stage 2-3. The Stage 1 dashboard does not connect to
-- the database yet: watchlists and portfolios are stored in the browser until
-- user accounts exist. This file is loaded automatically by
-- `docker compose --profile db up` so the schema can be reviewed and evolved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ── Users & roles ───────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('user', 'reviewer', 'compliance', 'admin');
CREATE TYPE kyc_status AS ENUM ('not_started', 'pending', 'verified', 'rejected');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  display_name  text,
  role          user_role NOT NULL DEFAULT 'user',
  kyc_status    kyc_status NOT NULL DEFAULT 'not_started',
  -- Reference into the KYC provider; identity documents are never stored here.
  kyc_provider_ref text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Stage 1 data, server-side (replaces browser storage) ────
CREATE TABLE watchlist_items (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_id    text NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, coin_id)
);

CREATE TABLE portfolio_lots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_id         text NOT NULL,
  quantity        numeric(38, 18) NOT NULL CHECK (quantity > 0),
  price_per_unit  numeric(38, 18) NOT NULL CHECK (price_per_unit >= 0),
  purchased_on    date NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON portfolio_lots (user_id, coin_id);

-- ── Stage 2: tokenization applications ──────────────────────
CREATE TYPE asset_category AS ENUM ('real_estate', 'business_interest', 'precious_metal', 'commodity', 'vehicle', 'collectible', 'intellectual_property', 'other');

-- Mirrors the required workflow:
-- Draft -> Submitted -> Identity Verification -> Ownership Review ->
-- Legal/Compliance Review -> Approved for Issuance -> Token Deployment -> Active
CREATE TYPE application_status AS ENUM (
  'draft', 'submitted', 'identity_verification', 'ownership_review', 'legal_compliance_review',
  'approved_for_issuance', 'token_deployment', 'active',
  'returned_for_revision', 'rejected', 'withdrawn'
);

CREATE TABLE asset_applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id       uuid NOT NULL REFERENCES users(id),
  category           asset_category NOT NULL,
  title              text NOT NULL,
  description        text,
  jurisdiction       text,
  estimated_value_usd numeric(20, 2) CHECK (estimated_value_usd >= 0),
  ownership_summary  text,
  proposed_structure jsonb NOT NULL DEFAULT '{}'::jsonb,  -- supply, rights, transfer restrictions
  compliance_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status             application_status NOT NULL DEFAULT 'draft',
  -- Source when imported from a client's GitHub repo (see docs/ROADMAP.md).
  source_repo        text,
  source_commit_sha  text,
  submitted_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON asset_applications (status);
CREATE INDEX ON asset_applications (applicant_id);

-- Documents live in private, encrypted object storage. Only metadata and the
-- storage key are kept here; files are served via short-lived signed URLs.
CREATE TYPE document_kind AS ENUM ('proof_of_ownership', 'legal', 'valuation', 'identity', 'insurance', 'custody', 'other');
CREATE TYPE review_state AS ENUM ('pending', 'accepted', 'rejected', 'needs_more_info');

CREATE TABLE application_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES asset_applications(id) ON DELETE CASCADE,
  kind            document_kind NOT NULL,
  file_name       text NOT NULL,
  content_type    text NOT NULL,
  size_bytes      bigint NOT NULL CHECK (size_bytes > 0),
  sha256          text NOT NULL,
  storage_key     text NOT NULL UNIQUE,
  review          review_state NOT NULL DEFAULT 'pending',
  uploaded_by     uuid NOT NULL REFERENCES users(id),
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Stage 3: review & compliance gates ──────────────────────
-- Each gate must be satisfied before issuance. Admin approval of the
-- application alone does NOT authorize token creation.
CREATE TYPE gate_kind AS ENUM ('identity', 'ownership', 'valuation', 'legal', 'regulatory', 'custody', 'smart_contract_audit');

CREATE TABLE compliance_gates (
  application_id  uuid NOT NULL REFERENCES asset_applications(id) ON DELETE CASCADE,
  gate            gate_kind NOT NULL,
  satisfied       boolean NOT NULL DEFAULT false,
  satisfied_by    uuid REFERENCES users(id),
  satisfied_at    timestamptz,
  evidence_note   text,
  PRIMARY KEY (application_id, gate),
  CHECK (NOT satisfied OR (satisfied_by IS NOT NULL AND satisfied_at IS NOT NULL))
);

-- Append-only audit trail for every state change and reviewer action.
CREATE TABLE audit_log (
  id              bigserial PRIMARY KEY,
  at              timestamptz NOT NULL DEFAULT now(),
  actor_id        uuid REFERENCES users(id),
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ON audit_log (entity_type, entity_id);

CREATE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Hard stop: an application cannot reach token deployment until every gate is satisfied.
CREATE FUNCTION enforce_issuance_gates() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('token_deployment', 'active') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF (SELECT count(*) FROM compliance_gates WHERE application_id = NEW.id AND satisfied) < (SELECT count(*) FROM unnest(enum_range(NULL::gate_kind))) THEN
      RAISE EXCEPTION 'Issuance blocked: not all compliance gates are satisfied for application %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_applications_issuance_gate BEFORE UPDATE OF status ON asset_applications
  FOR EACH ROW EXECUTE FUNCTION enforce_issuance_gates();
