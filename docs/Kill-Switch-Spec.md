**Bonded Kill Switch Specification**

**Overview**

The Evidence Vault is a canister-based store (stable memory) of relationship evidence. The intended use is to prove the veracity of spousal relationships for immigrant visa applications. Threshold techniques (2-of-3) are used to create the signing key for all ‘regular’ functions such as ICP upload messages and evidence retrieval messages. However there is a special function which requires only one partner’s authorisation: the Kill Switch. An example use case for this function is when the relationship breaks down and one partner decides to abandon the process – the function allows the partner to unilaterally delete all existing data to prevent the other partner using it for nefarious purposes (such as blackmail, etc.) 
**Purpose**
A unilateral mechanism by which either partner in a Bonded relationship can trigger the irreversible deletion of evidence stored in the Bonded canister on the Internet Computer. This deletion is executed cryptographically and procedurally without the cooperation of the other partner, using a solo VetKeys-derived key within a predefined context.

**1. Scope**
This specification governs the conditions, processes, and constraints under which a kill switch may be executed by an individual partner, affecting only ICP canister-stored data. It excludes:
•	Arweave-stored evidence (which is immutable and out of scope)
•	Standard threshold operations (which require 2-of-3 cooperation)

**2. Functional Description**

2.1. Triggering Party
•	Either partner in a valid Bonded relationship may independently initiate the kill switch.
•	No confirmation or agreement is required from the other partner.
•	Identity is established cryptographically using a VetKeys-derived key specific to that individual and relationship context.

2.2. Effect of Activation
•	All evidence associated with the relationship stored in the Bonded ICP canister will be:
o	Irrevocably deleted from stable memory.
o	Replaced with zeros or other overwrite technique to prevent forensic recovery.
o	Flagged as "destroyed" in the canister metadata to prevent future access or replay.

**3. Authentication and Authorization**

3.1. VetKeys Derivation Context
•	A special derivation context shall be used within vetKD for the kill-switch function:
ruby
CopyEdit
kill_switch:<relationshipID>:<partnerPrincipal>
•	This context must:
o	Be unique per relationship and partner
o	Be usable by vetKD to derive a deterministic signing key
o	Be registered with the canister during initial relationship setup

3.2. Signature Mechanism
•	The initiating partner uses the vetKD protocol to retrieve their kill-switch private key from the subnet nodes, encrypted for their device.
•	The partner signs a standard ICP message containing a delete_all_data() instruction.
•	The canister verifies this message using the associated public key, previously registered or derived.

**4. Assumptions & Pre-conditions**

4.1. Assumed VetKeys Capabilities (pending verification)
The following capabilities are presumed but not yet fully confirmed in VetKeys:
•	The ability to derive asymmetric key pairs (e.g., ECDSA or Ed25519) from a vetKD context, per user principal
•	The ability to derive such keys outside of threshold mode, i.e., for an individual principal alone
•	The ability to store or deterministically re-derive the same public key from a fixed context (so the canister can pre-register and verify against it)
•	VetKeys derivation operations are available to canisters and triggered by principals under standard ICP constraints
These assumptions must be validated against VetKeys documentation or clarified with its maintainers.

**5. Security Constraints**

5.1. Scope Isolation
•	The kill-switch context must be functionally and cryptographically isolated from all other vetKD operations (e.g., signing evidence upload or partner authentication)
•	No other context should allow unilateral authority over canister memory

5.2. Replay and Reentrancy
•	The kill switch may only be activated once per relationship
•	Any further attempts by either partner should fail with a consistent “AlreadyDeleted” error
•	Activation timestamp and partner identity must be stored in a tamper-proof canister log for auditability

**6. User Experience and Confirmations**
•	The UI must display a clear irreversible warning prior to initiating the kill-switch request
•	Upon confirmation, the client app triggers the kill-switch key derivation, constructs the signed message, and submits it to the canister
•	After canister confirmation, all evidence-related functions for that relationship must return "data not found" or equivalent

**7. Fallback & Failure Modes**
•	If the partner’s device is lost or vetKD derivation fails:
o	No fallback or recovery is permitted
o	The kill switch remains unexecuted unless triggered by the other partner
•	If kill switch is triggered mid-operation (e.g., during upload), the upload must be invalidated or rolled back
•	If the canister is temporarily unreachable, the request is retried until executed or invalidated by prior deletion

**8. Compliance and Governance**
•	This function must be auditable by internal tools but not overrideable by Bonded personnel
•	Canister code must be certified for this behavior prior to SNS launch
•	The function must be documented clearly in the user privacy policy and TOS

**Assumptions Check (Section 4.1 from spec)**
A. Can derive asymmetric keys per user / context
VetKD supports deterministic key derivation based on context and input, enabling distinct per-user keys for different use cases GitHub+11internetcomputer.org+11internetcomputer.org+11.
This includes identity-based encryption and key management bound to user principal, which aligns with the "kill_switch:<relationshipID>:<partnerPrincipal>" context.

B. Non-threshold (solo) derivation supported
VetKD allows derivation of any number of unique derived keys via different contexts — including contexts that grant signing or decryption capability tied to a single principal, not requiring threshold operations Internet Computer Developer Forum.
This supports the idea that a partner can derive their own solo-use key under a dedicated kill-switch context.

C. Public key verifiability / consistency
Derived keys are deterministic. Using the same context and inputs yields the same derived public key, letting the canister register or verify partner public keys over time Internet Computer Developer Forum+10Internet Computer Developer Forum+10internetcomputer.org+10.

D. VetKD system API usable from canisters
Canisters can invoke vetkd_derive_key and vetkd_public_key to retrieve encrypted keys (for users) or public keys. All derivations and transfers occur through the system API from within canisters Typefully+9internetcomputer.org+9GitHub+9.

E. Signing capability possible with derived keys
Although most examples focus on decryption (IBE) and data vault use, vetKD also supports generation of threshold BLS signatures and key derivation for signing per identity or context YouTube+12GitHub+12internetcomputer.org+12.

Thus derived keys can be used for signing—in the kill-switch use case.
________________________________________
**Caveats / Unverified Details**

•	Explicit “solo signer” use case (i.e. a derived per-user signing key used outside threshold-based joint signing) is not demonstrated in existing documentation. While theoretically supported, this pattern isn't conventional in the provided examples.

•	Transported private key purpose: vetKD encrypts the derived key using the user's transport key. It’s unclear whether signing keys for user-supplied contexts (versus IBE/decryption contexts) are supported out-of-the-box or require configuration with specific key types (e.g. BLS vs Ed25519).

•	Revocation or disabling contexts: VetKD doesn’t expose an explicit revoke mechanism in the documentation. Once derivation context exists, a user may derive again unless handled at the canister logic level or key registration layer.

_______________________________________
**Next Steps**
To fully validate:

1.	Test a prototype:
o	Derive a key using the proposed kill-switch context.
o	Verify the corresponding public key can be used to check signatures.

3.	Confirm signing support:
o	Ensure namespace supports signing (e.g. threshold BLS) using per-context keys as non-collaborative/signing keys.

5.	Review vetKD API limits:
o	Verify whether there are restrictions on signing versus decryption contexts, key lifespan, or output formats.

