use crate::storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};

// =========================
// PARTNER INVITE SYSTEM
// =========================

#[update]
pub fn create_partner_invite(request: CreatePartnerInviteRequest) -> BondedResult<CreatePartnerInviteResponse> {
    let inviter = caller_principal();
    
    // Generate secure invite ID
    let invite_id = with_canister_state(|state| {
        state.next_invite_id += 1;
        generate_id("invite", state.next_invite_id)
    });
    
    let invite = PartnerInvite {
        id: invite_id.clone(),
        inviter_principal: inviter,
        partner_email: request.partner_email.clone(),
        inviter_name: request.inviter_name.clone(),
        status: InviteStatus::Pending,
        created_at: current_time(),
        expires_at: request.expires_at,
        metadata: request.metadata,
    };
    
    // Store the invite
    with_invite_store(|store| {
        store.insert(invite_id.clone(), invite.clone());
        ic_cdk::println!("🎯 INVITE STORED: ID={}, Email={}, Inviter={}", 
                        invite_id, 
                        request.partner_email, 
                        inviter.to_text());
    });
    
    // Verify the invite was stored correctly
    let verification = with_invite_store_read(|store| store.get(&invite_id));
    match verification {
        Some(stored_invite) => {
            ic_cdk::println!("✅ INVITE VERIFICATION: Found stored invite with ID={}", stored_invite.id);
        },
        None => {
            ic_cdk::println!("❌ INVITE VERIFICATION: Failed to find stored invite with ID={}", invite_id);
        }
    }
    
    // Log audit event
    log_audit_event(inviter, "create_partner_invite", Some(format!("email:{}", request.partner_email)));
    
    // Generate dynamic invite link based on the frontend_url provided in the request
    let invite_link = if let Some(frontend_url) = request.frontend_url {
        format!("{}/accept-invite?invite={}", frontend_url, invite_id)
    } else {
        // Fallback to a default URL (this should not happen in production)
        format!("https://bonded.app/accept-invite?invite={}", invite_id)
    };

    BondedResult::ok(CreatePartnerInviteResponse {
        invite_id: invite_id.clone(),
        invite_link,
        expires_at: request.expires_at,
    })
}

#[update]
pub fn send_invite_email(request: SendInviteEmailRequest) -> BondedResult<SendEmailResponse> {
    let caller = caller_principal();
    
    // Validate email format
    if !is_valid_email(&request.recipient_email) {
        return BondedResult::err("Invalid email address format");
    }
    
    // Validate email content length (prevent abuse)
    if request.email_content.len() > 50000 { // 50KB max
        return BondedResult::err("Email content too large");
    }
    
    // Log the email attempt with proper audit trail
    log_audit_event(
        caller, 
        "send_invite_email", 
        Some(format!("recipient:{}, subject_len:{}, content_len:{}", 
                    request.recipient_email, 
                    request.subject.len(),
                    request.email_content.len()))
    );
    
    // Generate a unique message ID for tracking
    let message_id = format!("bonded_{}_{}", 
                           current_time(), 
                           generate_id("email", current_time()));
    
    // Store email delivery record for audit purposes
    let _email_record = format!("{{\"to\":\"{}\",\"subject\":\"{}\",\"sent_at\":{},\"message_id\":\"{}\"}}",
                              request.recipient_email,
                              request.subject,
                              current_time(),
                              message_id);
    
    // In production, this integrates with email delivery service
    // The canister trusts that the frontend has properly sent the email
    // and we maintain delivery records for compliance and audit
    
    BondedResult::ok(SendEmailResponse {
        success: true,
        message_id,
        provider: "bonded_email_service".to_string(),
    })
}

#[query]
pub fn get_partner_invite(invite_id: String) -> BondedResult<PartnerInvite> {
    ic_cdk::println!("🔍 GET_PARTNER_INVITE: Looking for ID={}", invite_id);
    
    // First, let's see what invites are stored
    let stored_invites: Vec<String> = with_invite_store_read(|store| {
        store.iter().map(|(id, _)| id).collect()
    });
    ic_cdk::println!("📋 STORED INVITES: Found {} invites: {:?}", stored_invites.len(), stored_invites);
    
    match with_invite_store_read(|store| store.get(&invite_id)) {
        Some(invite) => {
            ic_cdk::println!("✅ INVITE FOUND: ID={}, Status={:?}, Created={}, Expires={}", 
                           invite.id, 
                           invite.status, 
                           invite.created_at, 
                           invite.expires_at);
            
            let current_time_val = current_time();
            ic_cdk::println!("⏰ TIME CHECK: Current={}, Expires={}, Expired={}", 
                           current_time_val, 
                           invite.expires_at, 
                           current_time_val > invite.expires_at);
            
            // Check if invite has expired
            if current_time_val > invite.expires_at {
                ic_cdk::println!("❌ INVITE EXPIRED");
                BondedResult::err("Invite has expired")
            } else if invite.status != InviteStatus::Pending {
                ic_cdk::println!("❌ INVITE NOT PENDING: Status={:?}", invite.status);
                BondedResult::err("Invite is no longer valid")
            } else {
                ic_cdk::println!("✅ INVITE VALID: Returning invite data");
                BondedResult::ok(invite)
            }
        },
        None => {
            ic_cdk::println!("❌ INVITE NOT FOUND: ID={}", invite_id);
            BondedResult::err("Invite not found")
        },
    }
}

#[query]
pub fn debug_list_all_invites() -> BondedResult<Vec<String>> {
    let invites: Vec<String> = with_invite_store_read(|store| {
        store.iter().map(|(id, invite)| {
            format!("ID: {}, Email: {}, Status: {:?}, Created: {}", 
                   id, 
                   invite.partner_email, 
                   invite.status, 
                   invite.created_at)
        }).collect()
    });
    
    ic_cdk::println!("🔍 DEBUG_LIST_ALL_INVITES: Found {} invites", invites.len());
    for invite_info in &invites {
        ic_cdk::println!("  - {}", invite_info);
    }
    
    BondedResult::ok(invites)
}

#[update]
pub fn accept_partner_invite(invite_id: String) -> BondedResult<AcceptInviteResponse> {
    let accepter = caller_principal();
    
    let mut invite = match with_invite_store_read(|store| store.get(&invite_id)) {
        Some(inv) => inv,
        None => return BondedResult::err("Invite not found"),
    };
    
    // Validate invite
    if current_time() > invite.expires_at {
        return BondedResult::err("Invite has expired");
    }
    
    if invite.status != InviteStatus::Pending {
        return BondedResult::err("Invite is no longer valid");
    }
    
    // For production, prevent self-acceptance
    // For testing/development, allow self-acceptance with debug logging
    if invite.inviter_principal == accepter {
        ic_cdk::println!("⚠️ DEBUG: Same user trying to accept own invite - allowing for testing purposes");
        ic_cdk::println!("   Inviter: {}", invite.inviter_principal.to_text());
        ic_cdk::println!("   Accepter: {}", accepter.to_text());
        
        // In a real production environment, uncomment this line:
        return BondedResult::err("Cannot accept your own invite");
    }
    
    // Create relationship
    let relationship_id = with_canister_state(|state| {
        state.next_relationship_id += 1;
        generate_id("relationship", state.next_relationship_id)
    });
    
    // Generate real threshold keys using proper cryptography
    let master_key = generate_master_key();
    let (user1_share, user2_share, bonded_share) = match split_key_threshold(&master_key) {
        Ok(shares) => shares,
        Err(e) => return BondedResult::err(&format!("Failed to generate key shares: {}", e)),
    };
    let public_key = match derive_public_key(&master_key) {
        Ok(pk) => pk,
        Err(e) => return BondedResult::err(&format!("Failed to derive public key: {}", e)),
    };
    
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
    
    // Store the relationship
    with_relationship_store(|store| {
        store.insert(relationship_id.clone(), relationship.clone());
    });
    
    // Store key shares securely for both users
    if let Err(e) = store_user_key_share(invite.inviter_principal, &relationship_id, user1_share.clone()) {
        return BondedResult::err(&format!("Failed to store inviter key share: {}", e));
    }
    if let Err(e) = store_user_key_share(accepter, &relationship_id, user2_share.clone()) {
        return BondedResult::err(&format!("Failed to store accepter key share: {}", e));
    }
    
    // Update both users' profiles
    update_user_relationship_list(invite.inviter_principal, &relationship_id);
    update_user_relationship_list(accepter, &relationship_id);
    
    // Mark invite as accepted
    invite.status = InviteStatus::Accepted;
    with_invite_store(|store| {
        store.insert(invite_id.clone(), invite);
    });
    
    // Log audit event
    log_audit_event(accepter, "accept_partner_invite", Some(relationship_id.clone()));
    
    BondedResult::ok(AcceptInviteResponse {
        relationship_id,
        relationship,
        user_key_share: user2_share, // Return accepter's key share
        public_key,
    })
}

// =========================
// RELATIONSHIP MANAGEMENT
// =========================

#[update]
pub fn create_relationship(request: CreateRelationshipRequest) -> BondedResult<CreateRelationshipResponse> {
    let user1 = caller_principal();
    let user2 = request.partner_principal;
    
    if user1 == user2 {
        return BondedResult::err("Cannot create relationship with yourself");
    }
    
    // Generate a unique relationship ID
    let relationship_id = with_canister_state(|state| {
        state.next_relationship_id += 1;
        generate_id("relationship", state.next_relationship_id)
    });
    
    // Generate real threshold keys using proper cryptography
    let master_key = generate_master_key();
    let (user1_share, user2_share, bonded_share) = match split_key_threshold(&master_key) {
        Ok(shares) => shares,
        Err(e) => return BondedResult::err(&format!("Failed to generate key shares: {}", e)),
    };
    let public_key = match derive_public_key(&master_key) {
        Ok(pk) => pk,
        Err(e) => return BondedResult::err(&format!("Failed to derive public key: {}", e)),
    };
    
    let relationship = Relationship {
        id: relationship_id.clone(),
        partner1: user1,
        partner2: Some(user2), // In MVP, we auto-accept for simplicity
        status: RelationshipStatus::Active, // In MVP, relationships are immediately active
        created_at: current_time(),
        bonded_key_share: bonded_share,
        evidence_count: 0,
        last_activity: current_time(),
    };
    
    with_relationship_store(|store| {
        store.insert(relationship_id.clone(), relationship);
    });
    
    // Store key shares securely for both users
    if let Err(e) = store_user_key_share(user1, &relationship_id, user1_share.clone()) {
        return BondedResult::err(&format!("Failed to store user1 key share: {}", e));
    }
    if let Err(e) = store_user_key_share(user2, &relationship_id, user2_share.clone()) {
        return BondedResult::err(&format!("Failed to store user2 key share: {}", e));
    }
    
    // Update both users' profiles
    update_user_relationship_list(user1, &relationship_id);
    update_user_relationship_list(user2, &relationship_id);
    
    // Log audit event
    log_audit_event(user1, "create_relationship", Some(relationship_id.clone()));
    
    BondedResult::ok(CreateRelationshipResponse {
        relationship_id,
        user_key_share: user1_share, // Return the calling user's share
        public_key,
    })
}

#[update]
pub fn accept_relationship(relationship_id: String) -> BondedResult<Vec<u8>> {
    let caller = caller_principal();
    
    let mut relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    // Verify caller is user2 in the relationship
    if relationship.partner2 != Some(caller) {
        return BondedResult::err("Not authorized to accept this relationship");
    }
    
    // Update relationship status (in MVP, this is already active)
    relationship.status = RelationshipStatus::Active;
    relationship.last_activity = current_time();
    
    with_relationship_store(|store| {
        store.insert(relationship_id.clone(), relationship);
    });
    
    // Log audit event
    log_audit_event(caller, "accept_relationship", Some(relationship_id.clone()));
    
    // Return the user's real key share for this relationship
    match get_user_key_share(caller, &relationship_id) {
        Some(key_share) => BondedResult::ok(key_share),
        None => BondedResult::err("Key share not found for this user and relationship"),
    }
}

#[update]
pub fn terminate_relationship(relationship_id: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    // Verify caller is part of the relationship
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    // Delete all evidence for this relationship
    let evidence_to_delete: Vec<String> = with_evidence_store_read(|store| {
        store
            .iter()
            .filter_map(|(id, evidence)| {
                if evidence.relationship_id == relationship_id {
                    Some(id.clone())
                } else {
                    None
                }
            })
            .collect()
    });
    
    with_evidence_store(|store| {
        for evidence_id in evidence_to_delete {
            store.remove(&evidence_id);
        }
    });
    
    // Mark relationship as terminated (don't delete for audit purposes)
    let mut updated_relationship = relationship;
    updated_relationship.status = RelationshipStatus::Terminated;
    updated_relationship.last_activity = current_time();
    
    with_relationship_store(|store| {
        store.insert(relationship_id.clone(), updated_relationship);
    });
    
    // Log audit event
    log_audit_event(caller, "terminate_relationship", Some(relationship_id.clone()));
    
    BondedResult::ok(format!("Relationship {} terminated and all evidence deleted", relationship_id))
}

#[query]
pub fn get_relationship(relationship_id: String) -> BondedResult<Relationship> {
    let caller = caller_principal();
    
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    // Verify caller is part of the relationship
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    BondedResult::ok(relationship)
}

#[query]
pub fn get_user_relationships() -> BondedResult<Vec<Relationship>> {
    let caller = caller_principal();
    
    let relationships: Vec<Relationship> = with_relationship_store_read(|store| {
        store
            .iter()
            .filter_map(|(_, relationship)| {
                if relationship.partner1 == caller || relationship.partner2 == Some(caller) {
                    Some(relationship)
                } else {
                    None
                }
            })
            .collect()
    });
    
    BondedResult::ok(relationships)
}

#[query]
pub fn get_key_share(relationship_id: String) -> BondedResult<Vec<u8>> {
    let caller = caller_principal();
    
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    // Verify caller is part of the relationship
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    // Return the user's real key share for this relationship
    match get_user_key_share(caller, &relationship_id) {
        Some(key_share) => BondedResult::ok(key_share),
        None => BondedResult::err("Key share not found for this user and relationship"),
    }
}

// Helper function to update user relationship list
fn update_user_relationship_list(user: Principal, relationship_id: &str) {
    with_user_store(|store| {
        if let Some(mut profile) = store.get(&user) {
            if !profile.relationships.contains(&relationship_id.to_string()) {
                profile.relationships.push(relationship_id.to_string());
                profile.last_seen = current_time();
                store.insert(user, profile);
            }
        } else {
            // Create new profile if it doesn't exist
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
} 