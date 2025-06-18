use crate::types::*;
use candid::Principal;
use ic_cdk::api::time;
use sha2::{Digest, Sha256};

// Custom getrandom implementation for IC environment
use getrandom::register_custom_getrandom;

fn custom_getrandom(buf: &mut [u8]) -> Result<(), getrandom::Error> {
    // Simple deterministic randomness for MVP
    // In production, you'd use proper IC randomness APIs
    let timestamp = time();
    let mut seed = timestamp as u64;
    
    for byte in buf.iter_mut() {
        seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
        *byte = (seed >> 16) as u8;
    }
    
    Ok(())
}

register_custom_getrandom!(custom_getrandom);

// ==================
// UTILITY FUNCTIONS
// ==================

pub fn generate_id(prefix: &str, counter: u64) -> String {
    let timestamp = time();
    format!("{}_{:016x}_{:016x}", prefix, timestamp, counter)
}

pub fn generate_evidence_hash(data: &[u8], metadata: &EvidenceMetadata) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.update(metadata.timestamp.to_be_bytes());
    hasher.update(&metadata.content_type);
    hex::encode(hasher.finalize())
}

pub fn generate_relationship_key_share() -> Vec<u8> {
    // In a real implementation, this would use proper threshold cryptography
    // For MVP, we generate a random 32-byte key share
    let mut key_share = vec![0u8; 32];
    getrandom::getrandom(&mut key_share).expect("Failed to generate random key share");
    key_share
}

pub fn caller_principal() -> Principal {
    ic_cdk::api::caller()
}

pub fn current_time() -> u64 {
    time()
}

pub fn log_audit_event(user: Principal, action: &str, metadata: Option<String>) {
    let _entry = AuditLogEntry {
        id: generate_id("audit", current_time()),
        user,
        action: action.to_string(),
        timestamp: current_time(),
        metadata,
    };
    // In a full implementation, this would store to stable memory
    // For MVP, we just log for debugging
    ic_cdk::println!("AUDIT: {} performed {} at {}", user, action, current_time());
}

// =============================
// MOCK THRESHOLD CRYPTOGRAPHY
// =============================
// These are MVP implementations - would use proper crypto in production

pub fn generate_mock_master_key() -> Vec<u8> {
    // Generate a 32-byte master key
    let mut master_key = vec![0u8; 32];
    getrandom::getrandom(&mut master_key).expect("Failed to generate master key");
    master_key
}

pub fn split_key_mock(master_key: &[u8]) -> (Vec<u8>, Vec<u8>, Vec<u8>) {
    // In real implementation, this would use Shamir's Secret Sharing
    // For MVP, we just create three copies with different prefixes
    let mut user1_share = vec![1u8];
    let mut user2_share = vec![2u8];
    let mut bonded_share = vec![3u8];
    
    user1_share.extend_from_slice(master_key);
    user2_share.extend_from_slice(master_key);
    bonded_share.extend_from_slice(master_key);
    
    (user1_share, user2_share, bonded_share)
}

pub fn derive_public_key_mock(master_key: &[u8]) -> Vec<u8> {
    // In real implementation, this would derive the public key from the private key
    // For MVP, just hash the master key
    let mut hasher = Sha256::new();
    hasher.update(master_key);
    hasher.finalize().to_vec()
}

pub fn verify_relationship_access(relationship: &Relationship, caller: Principal) -> Result<(), String> {
    if relationship.partner1 != caller && relationship.partner2 != Some(caller) {
        return Err("Not authorized to access this relationship".to_string());
    }
    Ok(())
}

pub fn validate_evidence_metadata(metadata: &EvidenceMetadata) -> Result<(), String> {
    if metadata.content_type.is_empty() {
        return Err("Content type is required".to_string());
    }
    
    if metadata.timestamp == 0 {
        return Err("Timestamp is required".to_string());
    }
    
    // Ensure timestamp is not in the future (with some tolerance)
    let now = current_time();
    if metadata.timestamp > now + 60_000_000_000 { // 1 minute tolerance in nanoseconds
        return Err("Timestamp cannot be in the future".to_string());
    }
    
    Ok(())
}

pub fn validate_encrypted_data(data: &[u8]) -> Result<(), String> {
    if data.is_empty() {
        return Err("Encrypted data cannot be empty".to_string());
    }
    
    // Check for minimum size (IV + some data + tag)
    if data.len() < 32 {
        return Err("Encrypted data appears to be too small".to_string());
    }
    
    Ok(())
}

/**
 * Validate email address format
 */
pub fn is_valid_email(email: &str) -> bool {
    // Basic email validation - contains @ and has proper structure
    email.contains('@') 
        && email.len() > 5 
        && email.len() < 255 
        && !email.starts_with('@') 
        && !email.ends_with('@')
        && email.split('@').count() == 2
        && email.split('@').nth(1).unwrap().contains('.')
} 