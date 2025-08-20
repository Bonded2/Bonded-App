# Bonded-OpenChat Integration

Discussion document for Bonded/OpenChat tech call, Aug 2025

---

## Purpose
Enable private, authenticated direct messaging between relationship partners inside the Bonded app using OpenChat infrastructure.

---

## Integration Goals

-  Allow Bonded users (each a partner in a verified relationship) to message each other securely.
-  Maintain UX continuity within the Bonded app while leveraging OpenChat’s robust messaging backend.
-  Ensure messaging is scoped: users can only message their verified partner.
-  Avoid re-authentication or fragmented identity states.

---

## Option A: Embedded OpenChat (framed or integrated into Bonded UI)

**Frontend:**  
Bonded wraps or embeds OpenChat’s conversation UI in a web view or as a modular component.

**Backend:**  
Bonded uses OpenChat's canister interfaces (or HTTP outcalls if they offer a gateway) to create rooms, send messages, etc.

**Identity:**  
Need to ensure that Bonded users can be authenticated as OpenChat users — via delegation or a shared II session?

**Benefits:**  
-  Seamless user experience  
-  Keeps users in the Bonded app

**Risks/Needs:**  
-  Need detailed API documentation  
-  (Possibly) support for a multi-tenant or white-label mode…?  
-  (Possibly) OpenChat-side modifications for UI theming or message scoping…?

---

## Option B: Redirect to OpenChat (contextual linking)

**Frontend:**  
Bonded redirects users to a pre-authenticated OpenChat session — possibly scoped to a particular DM thread.

**Backend:**  
Less integration required; maybe just linking via `https://oc.app/chat/<user-id>`

**Identity:**  
Shared Internet Identity or mapping Bonded user IDs to OpenChat usernames…?

**Benefits:**  
-  Less development required on Bonded’s side  
-  Leverages OpenChat's full interface

**Risks/Needs:**  
-  Less seamless UX (Clients leave Bonded)  
-  Harder to enforce messaging context (e.g., restrict users to messaging only their partner)

---

## Key Questions for Discussion

-  Does OpenChat support programmatic user registration / mapping from external apps?
-  Are there stable Candid interfaces available for canister-level messaging?
-  Can OpenChat support UI embedding or white-labeled components?
-  Is there a way to scope chats to specific user pairs (i.e., prevent general chat access)?
-  What are the implications for scaling, rate limits, or cost?

---

## Notes from Bonded & OC Conference Call (06-Aug-2025)  
*(Stef/Hamish/Julian)*

### Embedded OpenChat window
-  Control routine gtm host site
-  Custom theming — look and feel
-  Direct message only — no navigation away, locked into chat
-  Initialize i-frame with a direct chat
-  Bonded embeds OpenChat frontend within a Bonded window

### User Mapping
-  How? Or create a new ID for existing OpenChat use
-  Ensure Bonded clients are already OpenChat users, possibly at onboarding (invisibly)
-  If clients already have an account — use it or create a separate account
-  Possibly a derived identity (to prevent OpenChat hijacking Bonded II)

### Technical Considerations
-  Deterministic IDs — sign in once to Bonded
-  OpenChat bot to collect evidence during chat (current framework exists)
-  Ability to install into a Direct Chat (buildable)
-  Listen for messages and collect previous messages
-  End-to-end encryption (E2E) — how to achieve?
-  Bot on device or canister?
-  Expose messages to the Bonded on-device app (via i-frame)

---

## From OpenChat Team (Julian) — 11 Aug 2025

> Hi Stef, I can add some technical details to your notes.  
> Here's a rough breakdown:

### Integration of OC into Bonded App
-  Provide a prototype for embedding OC (1 day)  
-  Theme the embedded OC window (2 days)  
-  Lock down navigation to just the chat (1 day)  
-  Broadcast message content to host window for encrypted messages (1-2 days)  
-  Pass delegated credentials to OC iframe for account linking (R&D needed)  

### E2E Encryption (~within 2 months)
-  Negotiate approach with Dfinity team  
-  Implement direct chat design

### User Management
-  Support programmatic user creation (requires R&D)  
-  UI account linking may cover OC account creation, possibly unnecessary

---

This structure should make your file clear and easy to read when viewed on GitHub. Would you like me to generate it as a downloadable markdown file?
