use crate::storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};

// ==================
// EVIDENCE METHODS
// ==================

#[update]
pub fn upload_evidence(
    relationship_id: String,
    encrypted_data: Vec<u8>,
    metadata: EvidenceMetadata,
) -> BondedResult<String> {
    let caller = caller_principal();
    
    // Validate inputs
    if let Err(msg) = validate_encrypted_data(&encrypted_data) {
        return BondedResult::err(&msg);
    }
    
    if let Err(msg) = validate_evidence_metadata(&metadata) {
        return BondedResult::err(&msg);
    }
    
    // Check if relationship exists and user has access
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    // Generate evidence ID and hash
    let evidence_id = with_canister_state(|state| {
        state.next_evidence_id += 1;
        generate_id("evidence", state.next_evidence_id)
    });
    
    let hash = generate_evidence_hash(&encrypted_data, &metadata);
    
    // Create evidence record
    let evidence = Evidence {
        id: evidence_id.clone(),
        relationship_id: relationship_id.clone(),
        encrypted_data,
        metadata,
        upload_timestamp: current_time(),
        hash,
        uploader: caller,
        signature: None, // MVP: signatures can be added later
    };
    
    // Store evidence
    with_evidence_store(|store| {
        store.insert(evidence_id.clone(), evidence);
    });
    
    // Update relationship evidence count
    let mut updated_relationship = relationship;
    updated_relationship.evidence_count += 1;
    updated_relationship.last_activity = current_time();
    
    with_relationship_store(|store| {
        store.insert(relationship_id, updated_relationship);
    });
    
    // Update user profile
    update_user_evidence_count(caller);
    
    // Log audit event
    log_audit_event(caller, "upload_evidence", Some(evidence_id.clone()));
    
    BondedResult::ok(evidence_id)
}

#[query]
pub fn get_timeline(
    relationship_id: String,
    page: u32,
    page_size: u32,
) -> BondedResult<TimelineResponse> {
    let caller = caller_principal();
    
    // Verify access to relationship
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    let skip = page * page_size;
    
    // Get all evidence for this relationship
    let mut all_evidence: Vec<Evidence> = with_evidence_store_read(|store| {
        store
            .iter()
            .filter_map(|(_, evidence)| {
                if evidence.relationship_id == relationship_id {
                    Some(evidence)
                } else {
                    None
                }
            })
            .collect()
    });
    
    // Sort by upload timestamp (newest first)
    all_evidence.sort_by(|a, b| b.upload_timestamp.cmp(&a.upload_timestamp));
    
    let total_count = all_evidence.len() as u64;
    let has_more = total_count > (skip + page_size) as u64;
    
    // Paginate
    let evidence: Vec<Evidence> = all_evidence
        .into_iter()
        .skip(skip as usize)
        .take(page_size as usize)
        .collect();
    
    BondedResult::ok(TimelineResponse {
        evidence,
        total_count,
        has_more,
    })
}

#[query]
pub fn get_timeline_with_filters(query: TimelineQuery) -> BondedResult<TimelineResponse> {
    let caller = caller_principal();
    
    // Verify access to relationship
    let relationship = match with_relationship_store_read(|store| store.get(&query.relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    let page = query.page.unwrap_or(0);
    let page_size = 20u32;
    let skip = page * page_size;
    
    // Get and filter evidence
    let mut all_evidence: Vec<Evidence> = with_evidence_store_read(|store| {
        store
            .iter()
            .filter_map(|(_, evidence)| {
                if evidence.relationship_id != query.relationship_id {
                    return None;
                }
                
                // Apply filters
                if let Some(ref category) = query.category_filter {
                    if !evidence.metadata.tags.contains(category) {
                        return None;
                    }
                }
                
                if let Some(start_date) = query.start_date {
                    if evidence.metadata.timestamp < start_date {
                        return None;
                    }
                }
                
                if let Some(end_date) = query.end_date {
                    if evidence.metadata.timestamp > end_date {
                        return None;
                    }
                }
                
                Some(evidence)
            })
            .collect()
    });
    
    // Sort by original timestamp (newest first)
    all_evidence.sort_by(|a, b| b.metadata.timestamp.cmp(&a.metadata.timestamp));
    
    let total_count = all_evidence.len() as u64;
    let has_more = total_count > (skip + page_size) as u64;
    
    // Paginate
    let evidence: Vec<Evidence> = all_evidence
        .into_iter()
        .skip(skip as usize)
        .take(page_size as usize)
        .collect();
    
    BondedResult::ok(TimelineResponse {
        evidence,
        total_count,
        has_more,
    })
}

#[update]
pub fn delete_evidence(evidence_id: String, relationship_id: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    // Verify evidence exists and user has access
    let evidence = match with_evidence_store_read(|store| store.get(&evidence_id)) {
        Some(ev) => ev,
        None => return BondedResult::err("Evidence not found"),
    };
    
    if evidence.relationship_id != relationship_id {
        return BondedResult::err("Evidence does not belong to specified relationship");
    }
    
    if evidence.uploader != caller {
        return BondedResult::err("Only the uploader can delete evidence");
    }
    
    // Delete the evidence
    with_evidence_store(|store| {
        store.remove(&evidence_id);
    });
    
    // Update relationship evidence count
    if let Some(mut relationship) = with_relationship_store_read(|store| store.get(&relationship_id)) {
        relationship.evidence_count = relationship.evidence_count.saturating_sub(1);
        relationship.last_activity = current_time();
        
        with_relationship_store(|store| {
            store.insert(relationship_id, relationship);
        });
    }
    
    // Log audit event
    log_audit_event(caller, "delete_evidence", Some(evidence_id.clone()));
    
    BondedResult::ok(format!("Evidence {} deleted successfully", evidence_id))
}

#[query]
pub fn get_evidence_by_id(evidence_id: String) -> BondedResult<Evidence> {
    let caller = caller_principal();
    
    let evidence = match with_evidence_store_read(|store| store.get(&evidence_id)) {
        Some(ev) => ev,
        None => return BondedResult::err("Evidence not found"),
    };
    
    // Verify user has access to the relationship
    let relationship = match with_relationship_store_read(|store| store.get(&evidence.relationship_id)) {
        Some(rel) => rel,
        None => return BondedResult::err("Relationship not found"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BondedResult::err(&msg);
    }
    
    BondedResult::ok(evidence)
}

// Helper function to update user evidence count
fn update_user_evidence_count(user: Principal) {
    with_user_store(|store| {
        if let Some(mut profile) = store.get(&user) {
            profile.total_evidence_uploaded += 1;
            profile.last_seen = current_time();
            store.insert(user, profile);
        } else {
            // Create new profile if it doesn't exist
            let profile = UserProfile {
                principal: user,
                created_at: current_time(),
                relationships: vec![],
                total_evidence_uploaded: 1,
                kyc_verified: false,
                last_seen: current_time(),
            };
            store.insert(user, profile);
        }
    });
} 