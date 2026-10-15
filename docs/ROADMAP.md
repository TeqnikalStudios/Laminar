# LAMINAR roadmap

Stage 1 (this repository today) is the market dashboard. This document is the plan for integrating real-world asset (RWA) tokenization on top of it. Nothing below is built yet unless marked ✅.

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Crypto dashboard: markets, charts, search, watchlist, portfolio | ✅ Built |
| 2 | Accounts, tokenization application portal, document storage, GitHub import | Planned |
| 3 | Administrative review portal and compliance gates | Planned (DB gates drafted in `db/schema.sql`) |
| 4 | Blockchain prototype on testnets: wallets, token contracts, ownership tracking | Planned |
| 5 | Production readiness: security, audits, legal and regulatory review, marketplace integrations | Planned |

## Guiding rules

1. **Approval is not issuance.** An admin approving an application never creates a token. Issuance stays blocked until every compliance gate (identity, ownership, valuation, legal, regulatory, custody, smart-contract audit) is satisfied. This is enforced in the database (`enforce_issuance_gates` trigger in `db/schema.sql`) as well as in application code.
2. **Tokenized is not tradable.** Marketplace listing, secondary trading, securities compliance and liquidity are evaluated separately, per asset and jurisdiction.
3. **Testnets and simulated assets only** until Stage 5 sign-off.
4. **No secrets in the frontend or the repo.** Keys live in the server environment or a secrets manager; private keys for deployment live in a KMS or HSM, never in `.env` files on developer machines.

## Target architecture

```
                ┌──────────────── Next.js app (web) ────────────────┐
 Browser ──────▶│ Dashboard UI · Tokenization portal · Admin portal │
                │ /api/* route handlers (auth, validation)          │
                └───────┬───────────────┬───────────────┬───────────┘
                        │               │               │
              ┌─────────▼───┐   ┌───────▼──────┐  ┌─────▼──────────┐
              │ market      │   │ tokenization │  │ chain service  │
              │ module      │   │ + compliance │  │ (Stage 4)      │
              │ (Stage 1 ✅)│   │ modules      │  │ viem, Foundry  │
              └─────┬───────┘   └───┬─────┬────┘  └─────┬──────────┘
                    │               │     │             │
               CoinGecko      PostgreSQL  Encrypted     EVM testnets
               (+ exchanges)              object store  (Sepolia, Amoy,
                                          (S3 + KMS)     Base Sepolia)
```

Each module (`src/modules/*`) owns its types, server code and client hooks, so market analytics, tokenization, compliance and blockchain can be developed and tested independently. If load or team size calls for it, the tokenization and chain modules can split into separate Node services behind the same API contract.

## Stage 2: Accounts and tokenization portal

**Accounts and roles**
- Auth.js (NextAuth) or Clerk with email + passkeys/OAuth, sessions in PostgreSQL.
- Roles: `user`, `reviewer`, `compliance`, `admin` (`user_role` in the schema), checked in every API route.
- Move watchlists and portfolios from `localStorage` to `watchlist_items` and `portfolio_lots`. Only `src/modules/portfolio/store.ts` changes; pages stay the same. Offer a one-time import of the browser data.

**Identity verification**
- Integrate a KYC provider (Persona, Sumsub, Onfido or Veriff) through their hosted flow. Store only the provider reference and status (`kyc_status`), never ID images.

**Guided application** (`/tokenization`)
1. Choose asset category.
2. Describe the asset: title, description, jurisdiction, estimated value, ownership summary.
3. Upload documents (ownership proof, legal, valuation/appraisal, insurance, custody).
4. Proposed token structure: supply, unit rights, transfer restrictions.
5. Compliance questionnaire, which varies by category and jurisdiction.
6. Review and submit. Status moves to `submitted`.

Drafts autosave. Each step is validated server-side with Zod schemas shared with the client.

**Secure document storage**
- Private S3-compatible bucket (AWS S3, Cloudflare R2, MinIO for local) with server-side encryption under a KMS key, versioning on, public access blocked.
- Uploads go directly from the browser via short-lived pre-signed URLs; the server records metadata, size and SHA-256 in `application_documents`.
- Malware scanning on upload; content-type allowlist (PDF, PNG, JPEG); size limits.
- Downloads only through pre-signed URLs issued after a permission check, and every access is written to `audit_log`.

**My Tokenized Assets** (`/tokenized-assets`): a status timeline per application, reviewer requests, and re-upload.

**Notifications**: in-app and email (Resend or SES) for status changes and price alerts.

### GitHub import of client tokenization files

Clients can keep their asset metadata in a GitHub repository and have LAMINAR pull it in.

- **LAMINAR GitHub App** with read-only `contents` permission. The client installs it on just the repositories they choose. No personal access tokens.
- **File format:** `laminar.asset.json` at the repo root (or one per folder for multiple assets), validated against a published JSON Schema: category, title, description, jurisdiction, estimated value, ownership summary, proposed token structure, and a list of public supporting files.
- **Import flow:** the client picks a repo and branch, LAMINAR reads the files through the GitHub API, validates them, and creates a `draft` application with `source_repo` and `source_commit_sha` recorded. The client reviews and submits as usual, so imported applications go through exactly the same verification.
- **Updates:** a GitHub `push` webhook (signature-verified) flags drafts whose source changed and offers to re-sync. Submitted applications are never changed silently.
- **Sensitive documents stay out of GitHub.** Identity documents, deeds and contracts are uploaded directly to LAMINAR's encrypted storage, not committed to a repository.

## Stage 3: Administrative portal

A separate `/admin` area (role-gated, with optional IP allowlist and enforced MFA):

- Application queue with filters by status, category, age and assigned reviewer.
- Application detail: applicant KYC status, document viewer with per-document accept/reject/needs-info, valuation review, and a compliance gate checklist (`compliance_gates`).
- Actions: request more information, return for revision, reject, approve for issuance. Each action needs a note and is written to the append-only `audit_log`.
- Four-eyes rule: a different user must satisfy legal and regulatory gates than the one who approved ownership.
- Dashboard of submitted assets by state, SLA timers and an audit log explorer.

Workflow: `Draft → Submitted → Identity Verification → Ownership Review → Legal/Compliance Review → Approved for Issuance → Token Deployment → Active`, with side states `returned_for_revision`, `rejected` and `withdrawn`. `Approved for Issuance` only unlocks deployment when every gate is satisfied.

## Stage 4: Blockchain prototype (testnets only)

- **Wallets:** wagmi + viem with WalletConnect / Reown AppKit; Ethereum Sepolia, Polygon Amoy and Base Sepolia.
- **Contracts:** Solidity with Foundry. A permissioned asset token based on ERC-3643 (T-REX) or ERC-20 with OpenZeppelin `AccessManager` plus a transfer-restriction hook backed by an on-chain allowlist of verified holders. Includes pause, forced transfer for legal recovery, and an asset metadata URI.
- **Deployment service:** server-side, triggered only for applications in `token_deployment`; keys in a KMS or HSM. Records contract address, chain id and transaction hash.
- **Ownership tracking:** index `Transfer` events (viem watchers or a hosted indexer) into PostgreSQL for holder balances and transaction history in the UI.
- **Testing:** Foundry unit and fuzz tests, Slither static analysis, and a testnet end-to-end run per release.

## Stage 5: Production preparation

- External smart-contract audit and fixes; bug bounty.
- Application security review and penetration test; dependency and secret scanning in CI.
- Legal and regulatory review per jurisdiction (securities status of each token, KYC/AML program, custody arrangements, disclosures, terms).
- Operational controls: incident response, key ceremonies, backups and restore drills, monitoring and alerting.
- Evaluate eligible marketplaces (regulated ATS or exchanges) per asset. Listing is a separate, per-asset decision.

## Next concrete steps after Stage 1

1. Pick an auth provider and a KYC provider (these determine Stage 2's integrations).
2. Add Drizzle or Prisma migrations generated from `db/schema.sql`.
3. Build the application wizard behind auth with S3-compatible storage (MinIO in `docker-compose` for local).
4. Register the LAMINAR GitHub App and publish the `laminar.asset.json` schema.
