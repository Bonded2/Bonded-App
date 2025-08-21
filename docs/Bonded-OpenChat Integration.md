# Bonded-OpenChat Integration

Discussion document for Bonded/OpenChat tech call, Aug 2025

**Purpose**: Enable private, authenticated direct messaging between relationship partners inside the Bonded app using OpenChat infrastructure.

## Integration Goals

- Allow Bonded users (each a partner in a verified relationship) to message each other securely
- Maintain UX continuity within the Bonded app while leveraging OpenChat's robust messaging backend
- Ensure messaging is scoped: users can only message their verified partner
- Avoid re-authentication or fragmented identity states

## Option A: Embedded OpenChat (framed or integrated into Bonded UI)

- **Frontend**: Bonded wraps or embeds OpenChat's conversation UI in a web view or as a modular component
- **Backend**: Bonded uses OpenChat's canister interfaces (or HTTP outcalls if they offer a gateway) to create rooms, send messages, etc.
- **Identity**: Need to ensure that Bonded users can be authenticated as OpenChat users — via delegation or a shared II session?

### Benefits:
- Seamless user experience
- Keeps users in the Bonded app

### Risks/Needs:
- Need detailed API documentation
- (Possibly) support for a multi-tenant or white-label mode…?
- (Possibly) OpenChat-side modifications for UI theming or message scoping…?

## Option B: Redirect to OpenChat (contextual linking)

- **Frontend**: Bonded redirects users to a pre-authenticated OpenChat session — possibly scoped to a particular DM thread
- **Backend**: Less integration required; maybe just linking via `https://oc.app/chat/<user-id>`
- **Identity**: Shared Internet Identity or mapping Bonded user IDs to OpenChat usernames…?

### Benefits:
- Less development required on Bonded's side
- Leverages OpenChat's full interface

### Risks/Needs:
- Less seamless UX (Clients leave Bonded)
- Harder to enforce messaging context (e.g., restrict users to messaging only their partner)

## Key Questions for Discussion

1. Does OpenChat support programmatic user registration / mapping from external apps?
2. Are there stable Candid interfaces available for canister-level messaging?
3. Can OpenChat support UI embedding or white-labeled components?
4. Is there a way to scope chats to specific user pairs (i.e., prevent general chat access)?
5. What are the implications for scaling, rate limits, or cost?

## Notes from Bonded <> OC conference call 06-Aug-2025 (Stef/Hamish/Julian)

- **Embedded OpenChat window**
- **Control routine from host site**
- **Custom theming** - Look and feel
- **Direct message – only** – no ability to navigate away – locked into the chat
  - Initialise i-frame with a direct chat
- **Bonded embeds OpenChat front-end within a Bonded window**
- **User mapping** – how? – or create a new ID for existing OpenChat use
  - Need to ensure bonded clients are already OpenChat users, i.e. presumably at the onboarding stage, invisibly
  - If clients already have an account – use that or need a separate account?
  - Probably a separate (derived identity – don't want OpenChat to be able to 'hijack'(?) their bonded II)
  - Deterministic IDs – sign in once to bonded
- **OpenChat bot** – to collect the evidence when chatting
  - Bot framework exists right now
  - But ability to install it into a Direct Chat – not yet – but buildable
  - Listen out for messages, also collect from previous messages
- **E2E encryption** – how to achieve
  - Bot on device?
  - Bot on canister?
  - Expose the message to the bonded on-device app (i-frame embedded)
- **Send GitHub** – to them

## From OpenChat team (Julian) 11 Aug 2025:

Hi Stef, I'm not 100% sure what you mean but I'm guessing you would just like us to add some technical flesh to the bones laid out in your notes which I can try to do.

So I'll try to split this up into the main areas of work with very rough estimates of work required from us where possible:

### Integration of OC into Bonded app

- [ ] Provide a rough prototype using the front end tech of choice to show how to embed OC **(1 day)**
- [ ] Make sure we can theme the embedded OC window sufficiently / appropriately **(2 days)**
- [ ] Make sure that we can lock down navigation to just the selected chat **(1 day)**
- [ ] Possibly to broadcast message content to the host window when the user reads messages. This is probably necessary to give Bonded access to the messages when they are e2e encrypted - it would be difficult / controversial to give a server side bot such access. Still probably need to think this idea through a little bit from a security point of view **(1-2 days)**
- [ ] Allow Bonded app to pass a delegated credential to the OC iframe in order to link the Bonded account to the OC account (hard to estimate - requires some R&D that we will begin very shortly)

### E2E Encryption (~within 2 months)

- [ ] Finish negotiating the correct approach with the Dfinity team
- [ ] Implement recommended design for direct chats

### User management

- [ ] Support the programmatic creation of users. I can't quite remember whether this was a requirement. This would again require some R&D and I think if we do the account linking smoothly in the UI it can include the OC account creation step so this might not actually be necessary.
