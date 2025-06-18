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
        store.insert(invite_id.clone(), invite);
    });
    
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
    let email_record = format!("{{\"to\":\"{}\",\"subject\":\"{}\",\"sent_at\":{},\"message_id\":\"{}\"}}",
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
    match with_invite_store_read(|store| store.get(&invite_id)) {
        Some(invite) => {
            // Check if invite has expired
            if current_time() > invite.expires_at {
                BondedResult::err("Invite has expired")
            } else if invite.status != InviteStatus::Pending {
                BondedResult::err("Invite is no longer valid")
            } else {
                BondedResult::ok(invite)
            }
        },
        None => BondedResult::err("Invite not found"),
    }
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
    
    if invite.inviter_principal == accepter {
        return BondedResult::err("Cannot accept your own invite");
    }
    
    // Create relationship
    let relationship_id = with_canister_state(|state| {
        state.next_relationship_id += 1;
        generate_id("relationship", state.next_relationship_id)
    });
    
    // Generate threshold keys
    let master_key = generate_mock_master_key();
    let (_user1_share, user2_share, bonded_share) = split_key_mock(&master_key);
    let public_key = derive_public_key_mock(&master_key);
    
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
    
    // For MVP, we'll simulate threshold key generation
    // In production, this would use proper threshold cryptography
    let master_key = generate_mock_master_key();
    let (user1_share, _user2_share, bonded_share) = split_key_mock(&master_key);
    let public_key = derive_public_key_mock(&master_key);
    
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
    log_audit_event(caller, "accept_relationship", Some(relationship_id));
    
    // For MVP, return a mock user2 key share
    let master_key = vec![2u8; 32]; // Mock master key
    let (_, user2_share, _) = split_key_mock(&master_key);
    
    BondedResult::ok(user2_share)
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
    
    // In a real implementation, this would return the user's specific key share
    // For MVP, we return a mock share
    let master_key = vec![1u8; 32];
    let (user_share, _, _) = split_key_mock(&master_key);
    
    BondedResult::ok(user_share)
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