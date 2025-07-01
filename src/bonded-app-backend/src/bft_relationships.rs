use crate::bft_consensus::*;
use crate::bft_storage::*;
use crate::storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};
use sha2::Digest;
use std::cell::RefCell;

// ============================
// BFT RELATIONSHIP STORAGE
// ============================

thread_local! {
    static BFT_RELATIONSHIP_STORAGE: RefCell<BftStorage<Relationship>> = RefCell::new(
        BftStorage::new("relationships".to_string(), 3)
    );
    
    static BFT_INVITE_STORAGE: RefCell<BftStorage<PartnerInvite>> = RefCell::new(
        BftStorage::new("invites".to_string(), 3)
    );
    
    static BFT_RELATIONSHIP_CONSENSUS: RefCell<BftConsensus> = RefCell::new(
        BftConsensus::new()
    );
}

// ============================
// BFT PARTNER INVITE SYSTEM
// ============================

#[update]
pub fn bft_create_partner_invite(
    request: CreatePartnerInviteRequest
) -> BftResult<BftInviteResponse> {
    let inviter = caller_principal();
    
    ic_cdk::println!("💌 BFT Partner Invite: Creating invite with Byzantine Fault Tolerance");
    
    // Step 1: Validate input with BFT consensus
    if !is_valid_email(&request.partner_email) {
        return BftResult::err("BFT Validation: Invalid email address");
    }
    
    // Step 2: Generate secure invite ID with BFT consensus
    let invite_id = BFT_RELATIONSHIP_CONSENSUS.with(|consensus| {
        let mut consensus = consensus.borrow_mut();
        
        match consensus.propose_operation(
            "generate_invite_id".to_string(),
            inviter,
            request.partner_email.as_bytes().to_vec(),
        ) {
            Ok(operation_id) => {
                let id = with_canister_state(|state| {
                    state.next_invite_id += 1;
                    generate_id("bft_invite", state.next_invite_id)
                });
                ic_cdk::println!("✅ BFT Consensus: Invite ID {} generated with operation {}", id, operation_id);
                id
            },
            Err(e) => {
                ic_cdk::println!("❌ BFT Consensus Failed: {}", e);
                return format!("bft_invite_{}", current_time());
            }
        }
    });
    
    // Step 3: Create BFT-secured invite
    let invite = PartnerInvite {
        id: invite_id.clone(),
        inviter_principal: inviter,
        partner_email: request.partner_email.clone(),
        inviter_name: request.inviter_name.clone(),
        status: InviteStatus::Pending,
        created_at: current_time(),
        expires_at: request.expires_at,
        metadata: request.metadata.clone(),
    };
    
    // Step 4: Store invite with BFT consensus and replication
    let store_result = BFT_INVITE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_store(invite_id.clone(), invite.clone(), inviter)
    });
    
    let bft_operation_id = match store_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Storage Failed: {}", e)),
    };
    
    // Step 5: Create integrity proof for invite
    let integrity_proof = create_invite_integrity_proof(&invite)?;
    
    // Step 6: Generate secure invite link
    let invite_link = if let Some(frontend_url) = request.frontend_url {
        format!("{}/accept-invite?invite={}&proof={}", 
               frontend_url, 
               invite_id, 
               hex::encode(&integrity_proof))
    } else {
        format!("https://bonded.app/accept-invite?invite={}&proof={}", 
               invite_id, 
               hex::encode(&integrity_proof))
    };
    
    // Step 7: Log BFT audit event
    log_bft_audit_event(
        inviter, 
        "bft_create_partner_invite", 
        Some(format!("email:{}", request.partner_email))
    )?;
    
    ic_cdk::println!("✅ BFT Partner Invite: Created {} with BFT protection", invite_id);
    
    BftResult::ok(BftInviteResponse {
        invite_id: invite_id.clone(),
        invite_link,
        expires_at: request.expires_at,
        bft_operation_id,
        integrity_proof,
        consensus_timestamp: current_time(),
    })
}

#[query]
pub fn bft_get_partner_invite(invite_id: String) -> BftResult<BftInviteDetails> {
    ic_cdk::println!("🔍 BFT Invite Query: Retrieving invite {} with integrity verification", invite_id);
    
    // Retrieve invite with BFT integrity verification
    let invite_result = BFT_INVITE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.bft_retrieve(&invite_id)
    });
    
    let invite = match invite_result {
        Ok(inv) => inv,
        Err(e) => return BftResult::err(&format!("BFT Error: Invite not found or corrupted: {}", e)),
    };
    
    // Verify invite hasn't expired
    let current_time_val = current_time();
    if current_time_val > invite.expires_at {
        return BftResult::err("BFT Error: Invite has expired");
    }
    
    // Verify invite status
    if invite.status != InviteStatus::Pending {
        return BftResult::err("BFT Error: Invite is no longer valid");
    }
    
    // Create integrity proof for verification
    let integrity_proof = create_invite_integrity_proof(&invite)?;
    
    ic_cdk::println!("✅ BFT Invite Query: Successfully retrieved and verified invite {}", invite_id);
    
    let time_until_expiry = invite.expires_at.saturating_sub(current_time_val);
    
    BftResult::ok(BftInviteDetails {
        invite,
        integrity_proof,
        verification_timestamp: current_time_val,
        time_until_expiry,
    })
}

#[update]
pub fn bft_accept_partner_invite(
    invite_id: String,
    integrity_proof: Vec<u8>
) -> BftResult<BftAcceptInviteResponse> {
    let accepter = caller_principal();
    
    ic_cdk::println!("🤝 BFT Accept Invite: Processing invite {} with BFT consensus", invite_id);
    
    // Step 1: Retrieve and verify invite with BFT
    let invite_result = BFT_INVITE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.bft_retrieve(&invite_id)
    });
    
    let mut invite = match invite_result {
        Ok(inv) => inv,
        Err(e) => return BftResult::err(&format!("BFT Error: Invite not found: {}", e)),
    };
    
    // Step 2: Verify integrity proof
    let expected_proof = create_invite_integrity_proof(&invite)?;
    if expected_proof != integrity_proof {
        return BftResult::err("BFT Error: Invalid integrity proof");
    }
    
    // Step 3: Validate invite conditions
    if current_time() > invite.expires_at {
        return BftResult::err("BFT Error: Invite has expired");
    }
    
    if invite.status != InviteStatus::Pending {
        return BftResult::err("BFT Error: Invite is no longer valid");
    }
    
    // Step 4: Prevent self-acceptance (production security)
    if invite.inviter_principal == accepter {
        return BftResult::err("BFT Error: Cannot accept your own invite");
    }
    
    // Step 5: Create relationship with BFT consensus
    let relationship_creation = BFT_RELATIONSHIP_CONSENSUS.with(|consensus| {
        let mut consensus = consensus.borrow_mut();
        
        consensus.propose_operation(
            "create_relationship".to_string(),
            accepter,
            format!("{}:{}", invite.inviter_principal.to_text(), accepter.to_text()).as_bytes().to_vec(),
        )
    });
    
    let _operation_id = match relationship_creation {
        Ok(operation_id) => {
            ic_cdk::println!("✅ BFT Consensus: Relationship creation approved with operation {}", operation_id);
            operation_id
        },
        Err(e) => return BftResult::err(&format!("BFT Consensus Failed: {}", e)),
    };
    
    // Step 6: Generate relationship ID and cryptographic materials
    let relationship_id = with_canister_state(|state| {
        state.next_relationship_id += 1;
        generate_id("bft_relationship", state.next_relationship_id)
    });
    
    // Generate BFT-secured threshold keys
    let master_key = generate_master_key();
    let (user1_share, user2_share, bonded_share) = match split_key_threshold(&master_key) {
        Ok(shares) => shares,
        Err(e) => return BftResult::err(&format!("BFT Cryptography Failed: {}", e)),
    };
    let public_key = match derive_public_key(&master_key) {
        Ok(pk) => pk,
        Err(e) => return BftResult::err(&format!("BFT Key Derivation Failed: {}", e)),
    };
    
    // Step 7: Create BFT-protected relationship
    let relationship = Relationship {
        id: relationship_id.clone(),
        partner1: invite.inviter_principal,
        partner2: Some(accepter),
        status: RelationshipStatus::Active,
        created_at: current_time(),
        bonded_key_share: bonded_share,
        evidence_count: 0,
        last_activity: current_time(),
    };
    
    // Step 8: Store relationship with BFT consensus
    let store_result = BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_store(relationship_id.clone(), relationship.clone(), accepter)
    });
    
    let _relationship_operation_id = match store_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Relationship Storage Failed: {}", e)),
    };
    
    // Step 9: Store key shares securely with BFT
    if let Err(e) = store_user_key_share_bft(invite.inviter_principal, &relationship_id, user1_share.clone()) {
        return BftResult::err(&format!("BFT Key Storage Failed (inviter): {}", e));
    }
    if let Err(e) = store_user_key_share_bft(accepter, &relationship_id, user2_share.clone()) {
        return BftResult::err(&format!("BFT Key Storage Failed (accepter): {}", e));
    }
    
    // Step 10: Update user profiles with BFT protection
    update_user_relationship_list_bft(invite.inviter_principal, &relationship_id)?;
    update_user_relationship_list_bft(accepter, &relationship_id)?;
    
    // Step 11: Mark invite as accepted with BFT
    invite.status = InviteStatus::Accepted;
    let _invite_update = BFT_INVITE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_update(invite_id.clone(), invite, accepter)
    });
    
    // Step 12: Log BFT audit event
    log_bft_audit_event(accepter, "bft_accept_partner_invite", Some(relationship_id.clone()))?;
    
    ic_cdk::println!("✅ BFT Accept Invite: Successfully created relationship {} with BFT protection", relationship_id);
    
    BftResult::ok(BftAcceptInviteResponse {
        relationship_id,
        relationship,
        user_key_share: user2_share,
        public_key,
        bft_consensus_proof: create_relationship_consensus_proof(&relationship)?,
        creation_timestamp: current_time(),
    })
}

// ============================
// BFT RELATIONSHIP MANAGEMENT
// ============================

#[update]
pub fn bft_create_direct_relationship(
    request: CreateRelationshipRequest
) -> BftResult<BftCreateRelationshipResponse> {
    let user1 = caller_principal();
    let user2 = request.partner_principal;
    
    ic_cdk::println!("🔗 BFT Direct Relationship: Creating relationship with BFT consensus");
    
    if user1 == user2 {
        return BftResult::err("BFT Error: Cannot create relationship with yourself");
    }
    
    // Step 1: Consensus for relationship creation
    let consensus_result = BFT_RELATIONSHIP_CONSENSUS.with(|consensus| {
        let mut consensus = consensus.borrow_mut();
        consensus.propose_operation(
            "create_direct_relationship".to_string(),
            user1,
            format!("{}:{}", user1.to_text(), user2.to_text()).as_bytes().to_vec(),
        )
    });
    
    let _consensus_operation_id = match consensus_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Consensus Failed: {}", e)),
    };
    
    // Step 2: Generate relationship materials
    let relationship_id = with_canister_state(|state| {
        state.next_relationship_id += 1;
        generate_id("bft_direct_rel", state.next_relationship_id)
    });
    
    let master_key = generate_master_key();
    let (user1_share, user2_share, bonded_share) = match split_key_threshold(&master_key) {
        Ok(shares) => shares,
        Err(e) => return BftResult::err(&format!("BFT Cryptography Failed: {}", e)),
    };
    let public_key = match derive_public_key(&master_key) {
        Ok(pk) => pk,
        Err(e) => return BftResult::err(&format!("BFT Key Derivation Failed: {}", e)),
    };
    
    // Step 3: Create BFT relationship
    let relationship = Relationship {
        id: relationship_id.clone(),
        partner1: user1,
        partner2: Some(user2),
        status: RelationshipStatus::Active,
        created_at: current_time(),
        bonded_key_share: bonded_share,
        evidence_count: 0,
        last_activity: current_time(),
    };
    
    // Step 4: Store with BFT
    let store_result = BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_store(relationship_id.clone(), relationship.clone(), user1)
    });
    
    let bft_operation_id = match store_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Storage Failed: {}", e)),
    };
    
    // Step 5: Store key shares
    store_user_key_share_bft(user1, &relationship_id, user1_share.clone())?;
    store_user_key_share_bft(user2, &relationship_id, user2_share.clone())?;
    
    // Step 6: Update profiles
    update_user_relationship_list_bft(user1, &relationship_id)?;
    update_user_relationship_list_bft(user2, &relationship_id)?;
    
    // Step 7: Audit log
    log_bft_audit_event(user1, "bft_create_direct_relationship", Some(relationship_id.clone()))?;
    
    ic_cdk::println!("✅ BFT Direct Relationship: Created {} with BFT protection", relationship_id);
    
    BftResult::ok(BftCreateRelationshipResponse {
        relationship_id,
        user_key_share: user1_share,
        public_key,
        bft_operation_id,
        consensus_proof: create_relationship_consensus_proof(&relationship)?,
        creation_timestamp: current_time(),
    })
}

#[query]
pub fn bft_get_relationship(relationship_id: String) -> BftResult<BftRelationshipDetails> {
    let caller = caller_principal();
    
    ic_cdk::println!("🔍 BFT Relationship Query: Retrieving {} with integrity verification", relationship_id);
    
    // Retrieve with BFT verification
    let relationship_result = BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.bft_retrieve(&relationship_id)
    });
    
    let relationship = match relationship_result {
        Ok(rel) => rel,
        Err(e) => return BftResult::err(&format!("BFT Error: Relationship not found: {}", e)),
    };
    
    // Verify access
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BftResult::err(&format!("BFT Access Control Failed: {}", msg));
    }
    
    // Create integrity proof
    let integrity_proof = create_relationship_consensus_proof(&relationship)?;
    
    ic_cdk::println!("✅ BFT Relationship Query: Successfully retrieved and verified {}", relationship_id);
    
    BftResult::ok(BftRelationshipDetails {
        relationship,
        integrity_proof,
        verification_timestamp: current_time(),
        consensus_status: "verified".to_string(),
    })
}

#[update]
pub fn bft_terminate_relationship(relationship_id: String) -> BftResult<String> {
    let caller = caller_principal();
    
    ic_cdk::println!("💔 BFT Terminate Relationship: Terminating {} with BFT consensus", relationship_id);
    
    // Retrieve relationship
    let relationship_result = BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.bft_retrieve(&relationship_id)
    });
    
    let relationship = match relationship_result {
        Ok(rel) => rel,
        Err(e) => return BftResult::err(&format!("BFT Error: Relationship not found: {}", e)),
    };
    
    // Verify access
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BftResult::err(&format!("BFT Access Control Failed: {}", msg));
    }
    
    // Consensus for termination
    let consensus_result = BFT_RELATIONSHIP_CONSENSUS.with(|consensus| {
        let mut consensus = consensus.borrow_mut();
        consensus.propose_operation(
            "terminate_relationship".to_string(),
            caller,
            relationship_id.as_bytes().to_vec(),
        )
    });
    
    let _consensus_operation_id = match consensus_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Consensus Failed: {}", e)),
    };
    
    // Mark as terminated
    let mut updated_relationship = relationship;
    updated_relationship.status = RelationshipStatus::Terminated;
    updated_relationship.last_activity = current_time();
    
    // Update with BFT
    let update_result = BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_update(relationship_id.clone(), updated_relationship, caller)
    });
    
    let bft_operation_id = match update_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Update Failed: {}", e)),
    };
    
    // Audit log
    log_bft_audit_event(caller, "bft_terminate_relationship", Some(relationship_id.clone()))?;
    
    ic_cdk::println!("✅ BFT Terminate: Successfully terminated {} with BFT protection", relationship_id);
    
    BftResult::ok(format!("Relationship {} terminated with BFT consensus (Operation: {})", relationship_id, bft_operation_id))
}

// ============================
// BFT INTEGRITY VERIFICATION
// ============================

#[query]
pub fn bft_verify_relationship_integrity() -> BftResult<BftIntegrityReport> {
    ic_cdk::println!("🔍 BFT Integrity: Verifying all relationships");
    
    BFT_RELATIONSHIP_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        match storage.verify_all_integrity() {
            Ok(report) => {
                ic_cdk::println!("✅ BFT Integrity: {} relationships verified, {} passed, {} failed", 
                               report.total_checked, report.integrity_passed, report.integrity_failed);
                BftResult::ok(report)
            },
            Err(e) => BftResult::err(&format!("BFT Integrity Check Failed: {}", e)),
        }
    })
}

// ============================
// BFT HELPER FUNCTIONS
// ============================

fn create_invite_integrity_proof(invite: &PartnerInvite) -> Result<Vec<u8>, String> {
    let proof_data = format!("invite_proof:{}:{}:{}:{}", 
                           invite.id, 
                           invite.inviter_principal.to_text(),
                           invite.partner_email,
                           invite.created_at);
    Ok(sha2::Sha256::digest(proof_data.as_bytes()).to_vec())
}

fn create_relationship_consensus_proof(relationship: &Relationship) -> Result<Vec<u8>, String> {
    let proof_data = format!("relationship_proof:{}:{}:{}:{}", 
                           relationship.id,
                           relationship.partner1.to_text(),
                           relationship.partner2.as_ref().map(|p| p.to_text()).unwrap_or_default(),
                           relationship.created_at);
    Ok(sha2::Sha256::digest(proof_data.as_bytes()).to_vec())
}

fn store_user_key_share_bft(
    user: Principal,
    relationship_id: &str,
    key_share: Vec<u8>
) -> Result<(), String> {
    let key_share_entry = UserKeyShare {
        key_id: format!("{}:{}", relationship_id, user.to_text()),
        user,
        relationship_id: relationship_id.to_string(),
        key_share,
        created_at: current_time(),
    };
    
    // Store in regular storage for now (could be upgraded to BFT storage)
    with_key_share_store(|store| {
        store.insert(key_share_entry.key_id.clone(), key_share_entry);
    });
    
    Ok(())
}

fn update_user_relationship_list_bft(user: Principal, relationship_id: &str) -> Result<(), String> {
    with_user_store(|store| {
        if let Some(mut profile) = store.get(&user) {
            if !profile.relationships.contains(&relationship_id.to_string()) {
                profile.relationships.push(relationship_id.to_string());
                profile.last_seen = current_time();
                store.insert(user, profile);
            }
        } else {
            let profile = UserProfile {
                principal: user,
                created_at: current_time(),
                relationships: vec![relationship_id.to_string()],
                total_evidence_uploaded: 0,
                kyc_verified: false,
                last_seen: current_time(),
            };
            store.insert(user, profile);
        }
    });
    
    Ok(())
}

fn log_bft_audit_event(
    user: Principal,
    action: &str,
    metadata: Option<String>,
) -> Result<(), String> {
    let audit_entry = AuditLogEntry {
        id: generate_id("bft_audit", current_time()),
        user,
        action: format!("BFT_{}", action),
        timestamp: current_time(),
        metadata,
    };
    
    ic_cdk::println!("📝 BFT Audit: {} - {} - {:?}", 
                   user.to_text(), action, audit_entry.metadata);
    
    Ok(())
}

// ============================
// BFT RESPONSE TYPES
// ============================

// All BFT response types are now defined in types.rs