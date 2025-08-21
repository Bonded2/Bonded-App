# Bonded KYC Overview with Matter-ID as Provider

## High-level Flow (Client Experience in Bonded App)

1. Client signs up → picks/autodetects jurisdiction (e.g., UK)
2. Bonded app asks the Orchestrator canister to start a KYC session
3. App opens MatterID's hosted flow (selfie, doc scan, liveness, etc.)
   - **How is this done? Via API?**
4. After completion, app is served the results from MatterID
5. Canister binds results to the user's Internet Identity (II) principal, stores only hashes + metadata, and (if available) saves credential descriptors (e.g., Yoti credential handle, MatterID Dignature handle)
6. App shows "Verified" with a Receipt ID and keeps any wallet credentials locally

## Components to Build

### A) Mobile App (Bonded)

- **Jurisdiction picker** (or geo/IP default + user confirm)
- **Deep link handling** (e.g., `bonded://idv/callback`)
- **Hosted flow launcher** (Custom Tab/SafariView/WebView) with PKCE (Proof Key for Code Exchange)?
- **Session polling + status UI** (spinner / resume)
- **Local wallet** for holding credentials (VCs / SDJWTs) if issued
- **II binding**: include the user's II principal when starting a session

#### App ↔ Canister API (Minimal)

candid```
startKycSession(jurisdiction: Text) -> {
sessionId: Text,
auth: {
codeChallenge: Text,
state: Text,
redirectUri: Text
},
startUrl: Text
}
completeKycSession(sessionId: Text, codeOrHandle: Text) -> {
status: Variant { Pending; Succeeded; Failed },
receiptId: Opt<Text>
}
getKycStatus(sessionId: Text) -> {
status: Variant { Pending; Succeeded; Failed },
evidence: Opt<IdentityEvidenceV1>
}
getReceipt(receiptId: Text) -> KycReceiptV1
```

**App responsibilities**: launch `startUrl`, capture callback code, call `completeKycSession`, then poll `getKycStatus` if needed.

### B) Orchestrator Canister (ICP)

Drives sessions and talks to MatterID via HTTPS outcalls.

#### Core Responsibilities

- **Session manager**: create `sessionId`, state, nonce, PKCE `code_challenge`. Persist `{principal, jurisdiction, started_at}`
- **MatterID handoff**: build `startUrl` for the hosted flow (include jurisdiction + state + code_challenge + redirect URI)
- **Token/code exchange** (on `completeKycSession`):
  - If MatterID requires a confidential client, keep the `client_secret` in the canister, not on device
  - Do exchange via HTTPS outcalls (ICP feature)
- **Fetch results**: call MatterID's results endpoint with the access token; store only digests and normalized fields
- **Webhook endpoint** (optional): implement `http_request` to accept event-only webhooks (status changes), then pull the full result via outcall
- **Evidence normalization**: map MatterID response to `IdentityEvidenceV1`
- **II binding**: bind evidence to the caller's II principal from `startKycSession`
- **Receipts**: append-only audit record + `receiptId` returned to the app
- **Credential pointers**: if MatterID/Yoti issues a VC/SDJWT, store only the metadata + hash; the credential stays in the app wallet (or encrypted off-chain if you later add a cloud backup)

#### Optional Sub-canisters

- **Secrets/tECDSA canister** (if you need to sign requests or rotate keys)
- **Evidence registry** (append-only log, easier export/audit)
- **Verifier canister** (to verify VCs later via OID4VP if you go VC-first)

## Security & Privacy Guardrails

- **No secrets on device**: If a confidential client is required, keep secrets in the canister
- **Data minimization**: Do not store raw PII in canisters. Store hashes, references, and normalized fields only
- **Size limits**: Keep canister payloads small. If you must retain raw payloads (discouraged), encrypt client-side and store off-chain (e.g., ICFS with client-held key)
- **Binding**: Tie every evidence record to II principal + session_id + state/nonce
- **Jurisdiction mapping**: Let the canister decide the policy (which sub-IDSP to use via MatterID) based on jurisdiction so the app remains thin

## UI/UX Notes for a Seamless "White-label" Feel

- Show "Verified by MatterID" subtly (transparency) but keep Bonded's look & feel
- Use the hosted flow in a Chrome Custom Tab/SafariView so it feels in-app
- Provide resume links if the app is backgrounded during capture
- After success, show a "Verified • Yoti (via MatterID)" badge for jurisdictions that mandate a named IDSP

## Engineering Tasks Checklist

### Mobile App

- [ ] Add jurisdiction selector and consent checkboxes
- [ ] Implement `startKycSession` → open `startUrl` in webview/tab
- [ ] Implement deep-link callback handler → call `completeKycSession`
- [ ] Implement polling UI with `getKycStatus`
- [ ] Add local credential wallet (if using VCs/SDJWT)

### Orchestrator Canister

- [ ] Candid interface for the four methods above
- [ ] Session storage (principal, jurisdiction, PKCE, timestamps)
- [ ] HTTPS outcalls: token exchange + results fetch
- [ ] (Optional) `http_request` webhook handler (signature verification + enqueue fetch)
- [ ] Evidence normalization to `IdentityEvidenceV1`
- [ ] Append-only receipts registry with hash chaining
- [ ] Configurable policy map: jurisdiction → required upstream IDSP(s) (so you can show "Yoti via MatterID" for UK)

### DevOps (ICP Side)

- [ ] Configure custom domain → canister for webhook endpoint (TLS via boundary nodes)
- [ ] Secret rotation strategy (if any) and tECDSA signatures for request signing (if required by partner)
- [ ] Monitoring: event log of sessions, status changes, and outcall failures

## Assumptions to Confirm with MatterID (Partner Docs)

- [ ] Hosted flow supports public client + PKCE with app deep link
- [ ] Token exchange can be performed from a confidential client (keep secret in canister if needed)
- [ ] Results API returns: upstream IDSP, session/reference IDs, decision, evidence types, timestamps, optional credential issuance (VC / SDJWT) handles
- [ ] Webhook supports small event payloads + signature verification (HMAC/JWS)
- [ ] Ability to surface the original Yoti/iProov references unmodified for audit
