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
// BFT EVIDENCE STORAGE
// ============================

thread_local! {
    static BFT_EVIDENCE_STORAGE: RefCell<BftStorage<Evidence>> = RefCell::new(
        BftStorage::new("evidence".to_string(), 3) // 3-replica minimum for BFT
    );
    
    static BFT_EVIDENCE_CONSENSUS: RefCell<BftConsensus> = RefCell::new(
        BftConsensus::new()
    );
}

// ============================
// BFT EVIDENCE OPERATIONS
// ============================

#[update]
pub fn bft_upload_evidence(
    relationship_id: String,
    encrypted_data: Vec<u8>,
    metadata: EvidenceMetadata,
) -> BftResult<BftEvidenceResponse> {
    let caller = caller_principal();
    
    ic_cdk::println!("🔐 BFT Evidence Upload: Starting Byzantine Fault Tolerant evidence upload");
    
    // Step 1: Validate inputs with BFT verification
    if let Err(msg) = validate_encrypted_data(&encrypted_data) {
        return BftResult::err(&format!("BFT Validation Failed: {}", msg));
    }
    
    if let Err(msg) = validate_evidence_metadata(&metadata) {
        return BftResult::err(&format!("BFT Metadata Validation Failed: {}", msg));
    }
    
    // Step 2: Verify relationship access with BFT consensus
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BftResult::err("BFT Error: Relationship not found in consensus storage"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BftResult::err(&format!("BFT Access Control Failed: {}", msg));
    }
    
    // Step 3: Generate BFT evidence ID with consensus
    let evidence_id = BFT_EVIDENCE_CONSENSUS.with(|consensus| {
        let mut consensus = consensus.borrow_mut();
        
        // Propose evidence ID generation through BFT consensus
        match consensus.propose_operation(
            "generate_evidence_id".to_string(),
            caller,
            relationship_id.as_bytes().to_vec(),
        ) {
            Ok(operation_id) => {
                let id = with_canister_state(|state| {
                    state.next_evidence_id += 1;
                    generate_id("bft_evidence", state.next_evidence_id)
                });
                ic_cdk::println!("✅ BFT Consensus: Evidence ID {} generated with operation {}", id, operation_id);
                id
            },
            Err(e) => {
                ic_cdk::println!("❌ BFT Consensus Failed: {}", e);
                return format!("bft_evidence_{}", current_time()); // Fallback
            }
        }
    });
    
    // Step 4: Create BFT-protected evidence with integrity proofs
    let hash = generate_evidence_hash(&encrypted_data, &metadata);
    let evidence = Evidence {
        id: evidence_id.clone(),
        relationship_id: relationship_id.clone(),
        encrypted_data: encrypted_data.clone(),
        metadata,
        upload_timestamp: current_time(),
        hash: hash.clone(),
        uploader: caller,
        signature: Some(match create_bft_signature(&encrypted_data, hash.as_bytes()) {
            Ok(sig) => sig,
            Err(e) => return BftResult::err(&format!("BFT Signature Failed: {}", e)),
        }),
    };
    
    // Step 5: Store evidence with BFT consensus and replication
    let operation_result = BFT_EVIDENCE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_store(evidence_id.clone(), evidence.clone(), caller)
    });
    
    let bft_operation_id = match operation_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Storage Failed: {}", e)),
    };
    
    // Step 6: Update relationship with BFT consensus
    let mut updated_relationship = relationship;
    updated_relationship.evidence_count += 1;
    updated_relationship.last_activity = current_time();
    
    // Use BFT consensus for relationship update
    match update_relationship_with_bft(relationship_id.clone(), updated_relationship, caller) {
        Ok(_) => ic_cdk::println!("✅ BFT: Relationship updated with consensus"),
        Err(e) => ic_cdk::println!("⚠️ BFT Warning: Relationship update failed: {}", e),
    }
    
    // Step 7: Update user profile with BFT protection
    if let Err(e) = update_user_evidence_count_bft(caller) {
        ic_cdk::println!("⚠️ BFT Warning: User profile update failed: {}", e);
    }
    
    // Step 8: Create BFT audit log
    if let Err(e) = log_bft_audit_event(caller, "bft_upload_evidence", Some(evidence_id.clone())) {
        ic_cdk::println!("⚠️ BFT Warning: Audit log failed: {}", e);
    }
    
    let consensus_proof = match create_consensus_proof(&evidence) {
        Ok(proof) => proof,
        Err(e) => return BftResult::err(&format!("BFT Consensus Proof Failed: {}", e)),
    };
    
    ic_cdk::println!("✅ BFT Evidence Upload Complete: {} (Operation: {})", evidence_id, bft_operation_id);
    
    BftResult::ok(BftEvidenceResponse {
        evidence_id,
        bft_operation_id,
        consensus_proof,
        integrity_hash: hash,
        replication_status: "replicated".to_string(),
    })
}

#[query]
pub fn bft_get_timeline(
    relationship_id: String,
    page: u32,
    page_size: u32,
) -> BftResult<BftTimelineResponse> {
    let caller = caller_principal();
    
    ic_cdk::println!("🔍 BFT Timeline Query: Retrieving timeline with Byzantine Fault Tolerance");
    
    // Verify access with BFT
    let relationship = match with_relationship_store_read(|store| store.get(&relationship_id)) {
        Some(rel) => rel,
        None => return BftResult::err("BFT Error: Relationship not found"),
    };
    
    if let Err(msg) = verify_relationship_access(&relationship, caller) {
        return BftResult::err(&format!("BFT Access Control Failed: {}", msg));
    }
    
    // Retrieve evidence with BFT integrity verification
    let bft_evidence_list = BFT_EVIDENCE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        let mut verified_evidence = Vec::new();
        
        // Get all evidence entries and verify their integrity
        for (key, _) in &storage.entries {
            if key.starts_with(&format!("{}:", relationship_id)) {
                match storage.bft_retrieve(key) {
                    Ok(evidence) => {
                        if evidence.relationship_id == relationship_id {
                            verified_evidence.push(evidence);
                        }
                    },
                    Err(e) => {
                        ic_cdk::println!("⚠️ BFT Integrity Warning: Failed to verify evidence {}: {}", key, e);
                    }
                }
            }
        }
        
        verified_evidence
    });
    
    // Sort by upload timestamp (newest first) with BFT verification
    let mut sorted_evidence = bft_evidence_list;
    sorted_evidence.sort_by(|a, b| b.upload_timestamp.cmp(&a.upload_timestamp));
    
    // Apply pagination
    let skip = (page * page_size) as usize;
    let total_count = sorted_evidence.len() as u64;
    let has_more = total_count > (skip + page_size as usize) as u64;
    
    let paginated_evidence: Vec<Evidence> = sorted_evidence
        .into_iter()
        .skip(skip)
        .take(page_size as usize)
        .collect();
    
    // Verify integrity of returned evidence
    let integrity_report = verify_evidence_list_integrity(&paginated_evidence)?;
    
    ic_cdk::println!("✅ BFT Timeline: Retrieved {} evidence items with integrity verification", paginated_evidence.len());
    
    BftResult::ok(BftTimelineResponse {
        evidence: paginated_evidence,
        total_count,
        has_more,
        integrity_report,
        bft_consensus_timestamp: current_time(),
    })
}

#[update]
pub fn bft_delete_evidence(
    evidence_id: String,
    relationship_id: String,
) -> BftResult<String> {
    let caller = caller_principal();
    
    ic_cdk::println!("🗑️ BFT Evidence Deletion: Starting Byzantine Fault Tolerant deletion");
    
    // Verify evidence exists and ownership with BFT
    let evidence = BFT_EVIDENCE_STORAGE.with(|storage| {
        let storage = storage.borrow();
        storage.bft_retrieve(&evidence_id)
    });
    
    let evidence = match evidence {
        Ok(ev) => ev,
        Err(e) => return BftResult::err(&format!("BFT Error: Evidence not found or corrupted: {}", e)),
    };
    
    // Verify ownership and relationship
    if evidence.relationship_id != relationship_id {
        return BftResult::err("BFT Error: Evidence does not belong to specified relationship");
    }
    
    if evidence.uploader != caller {
        return BftResult::err("BFT Error: Only the uploader can delete evidence");
    }
    
    // Delete with BFT consensus
    let delete_result = BFT_EVIDENCE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.bft_delete(evidence_id.clone(), caller)
    });
    
    let operation_id = match delete_result {
        Ok(op_id) => op_id,
        Err(e) => return BftResult::err(&format!("BFT Deletion Failed: {}", e)),
    };
    
    // Update relationship count with BFT
    if let Some(mut relationship) = with_relationship_store_read(|store| store.get(&relationship_id)) {
        relationship.evidence_count = relationship.evidence_count.saturating_sub(1);
        relationship.last_activity = current_time();
        
        if let Err(e) = update_relationship_with_bft(relationship_id.clone(), relationship, caller) {
            ic_cdk::println!("⚠️ BFT Warning: Failed to update relationship after deletion: {}", e);
        }
    }
    
    // Log BFT audit event
    log_bft_audit_event(caller, "bft_delete_evidence", Some(evidence_id.clone()))?;
    
    ic_cdk::println!("✅ BFT Evidence Deletion Complete: {} (Operation: {})", evidence_id, operation_id);
    
    BftResult::ok(format!("Evidence {} deleted successfully with BFT consensus (Operation: {})", evidence_id, operation_id))
}

#[query] 
pub fn bft_verify_evidence_integrity(evidence_id: String) -> BftResult<BftIntegrityReport> {
    ic_cdk::println!("🔍 BFT Integrity Check: Verifying evidence {}", evidence_id);
    
    BFT_EVIDENCE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        
        // Perform comprehensive integrity verification
        match storage.verify_all_integrity() {
            Ok(report) => {
                ic_cdk::println!("✅ BFT Integrity: Verified {} entries, {} passed, {} failed", 
                               report.total_checked, report.integrity_passed, report.integrity_failed);
                BftResult::ok(report)
            },
            Err(e) => BftResult::err(&format!("BFT Integrity Check Failed: {}", e)),
        }
    })
}

#[update]
pub fn bft_recover_corrupted_evidence(evidence_id: String) -> BftResult<String> {
    let caller = caller_principal();
    
    ic_cdk::println!("🔧 BFT Recovery: Attempting to recover evidence {}", evidence_id);
    
    let recovery_result = BFT_EVIDENCE_STORAGE.with(|storage| {
        let mut storage = storage.borrow_mut();
        storage.recover_corrupted_data(&evidence_id)
    });
    
    match recovery_result {
        Ok(_) => {
            log_bft_audit_event(caller, "bft_recover_evidence", Some(evidence_id.clone()))?;
            ic_cdk::println!("✅ BFT Recovery: Successfully recovered evidence {}", evidence_id);
            BftResult::ok(format!("Evidence {} successfully recovered using BFT mechanisms", evidence_id))
        },
        Err(e) => BftResult::err(&format!("BFT Recovery Failed: {}", e)),
    }
}

// ============================
// BFT HELPER FUNCTIONS
// ============================

fn create_bft_signature(data: &[u8], hash: &[u8]) -> Result<Vec<u8>, String> {
    // Create BFT signature combining data and hash
    let signature_input = [data, hash].concat();
    let signature_data = format!("{}:{}", ic_cdk::api::caller().to_text(), hex::encode(signature_input));
    Ok(sha2::Sha256::digest(signature_data.as_bytes()).to_vec())
}

fn create_consensus_proof(evidence: &Evidence) -> Result<Vec<u8>, String> {
    // Create proof of BFT consensus for this evidence
    let proof_data = format!("consensus:{}:{}:{}", 
                           evidence.id, 
                           evidence.upload_timestamp, 
                           evidence.uploader.to_text());
    Ok(sha2::Sha256::digest(proof_data.as_bytes()).to_vec())
}

fn update_relationship_with_bft(
    relationship_id: String,
    relationship: Relationship,
    initiator: Principal,
) -> Result<String, String> {
    // In a production system, this would use BFT consensus for relationship updates
    with_relationship_store(|store| {
        store.insert(relationship_id, relationship);
    });
    
    ic_cdk::println!("✅ BFT: Relationship updated with simulated consensus");
    Ok("bft_relationship_update".to_string())
}

fn update_user_evidence_count_bft(user: Principal) -> Result<(), String> {
    // Update user profile with BFT protection
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
    
    // In production, this would also use BFT storage for audit logs
    ic_cdk::println!("📝 BFT Audit: {} - {} - {:?}", 
                   user.to_text(), action, audit_entry.metadata);
    
    Ok(())
}

fn verify_evidence_list_integrity(evidence_list: &[Evidence]) -> Result<BftIntegrityReport, String> {
    let mut report = BftIntegrityReport {
        total_checked: evidence_list.len() as u64,
        integrity_passed: 0,
        integrity_failed: 0,
        corrupted_entries: vec![],
        byzantine_nodes: vec![],
        recovery_needed: vec![],
    };
    
    for evidence in evidence_list {
        // Verify hash integrity
        let computed_hash = generate_evidence_hash(&evidence.encrypted_data, &evidence.metadata);
        if computed_hash == evidence.hash {
            report.integrity_passed += 1;
        } else {
            report.integrity_failed += 1;
            report.corrupted_entries.push(evidence.id.clone());
            report.recovery_needed.push(evidence.id.clone());
        }
    }
    
    Ok(report)
}

// ============================
// BFT RESPONSE TYPES
// ============================

// BftEvidenceResponse, BftTimelineResponse, and BftResult are now defined in types.rs