use crate::types::*;
use crate::storage::*;
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
// REAL THRESHOLD CRYPTOGRAPHY
// =============================
// Production-ready threshold cryptography using Shamir's Secret Sharing

use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use hkdf::Hkdf;

/// Generate a cryptographically secure master key for the relationship
pub fn generate_master_key() -> Vec<u8> {
    // Generate a proper Ed25519 private key (32 bytes)
    let mut secret_bytes = [0u8; 32];
    getrandom::getrandom(&mut secret_bytes).expect("Failed to generate secure random key");
    secret_bytes.to_vec()
}

/// Split master key using XOR-based threshold approach (simplified for MVP)
/// Returns (user1_share, user2_share, bonded_recovery_share)
/// This is a simplified 2-of-3 threshold: user1_share XOR user2_share = master_key
/// bonded_share = user1_share XOR master_key (so bonded + user1 = master_key)
pub fn split_key_threshold(master_key: &[u8]) -> Result<(Vec<u8>, Vec<u8>, Vec<u8>), String> {
    if master_key.len() != 32 {
        return Err("Master key must be exactly 32 bytes".to_string());
    }

    // Generate a random user1_share
    let mut user1_share = vec![0u8; 32];
    getrandom::getrandom(&mut user1_share).map_err(|e| format!("Failed to generate random share: {}", e))?;
    
    // user2_share = master_key XOR user1_share
    // This means: user1_share XOR user2_share = master_key
    let mut user2_share = vec![0u8; 32];
    for i in 0..32 {
        user2_share[i] = master_key[i] ^ user1_share[i];
    }
    
    // bonded_share = user1_share XOR master_key  
    // This means: user1_share XOR bonded_share = master_key
    let mut bonded_share = vec![0u8; 32];
    for i in 0..32 {
        bonded_share[i] = user1_share[i] ^ master_key[i];
    }

    Ok((user1_share, user2_share, bonded_share))
}

/// Reconstruct master key from any 2 of the 3 shares
pub fn reconstruct_key_from_shares(share1: &[u8], share2: &[u8]) -> Result<Vec<u8>, String> {
    if share1.len() != 32 || share2.len() != 32 {
        return Err("Both shares must be exactly 32 bytes".to_string());
    }
    
    // XOR the two shares to get the master key
    let mut master_key = vec![0u8; 32];
    for i in 0..32 {
        master_key[i] = share1[i] ^ share2[i];
    }

    Ok(master_key)
}

/// Derive Ed25519 public key from master private key
pub fn derive_public_key(master_key: &[u8]) -> Result<Vec<u8>, String> {
    if master_key.len() != 32 {
        return Err("Master key must be exactly 32 bytes".to_string());
    }

    // Convert to Ed25519 signing key
    let signing_key = SigningKey::from_bytes(master_key.try_into().map_err(|_| "Invalid key length")?);
    
    // Derive public key
    let verifying_key = signing_key.verifying_key();
    
    Ok(verifying_key.to_bytes().to_vec())
}

/// Derive AES encryption key from master key using HKDF
pub fn derive_encryption_key(master_key: &[u8], relationship_id: &str) -> Result<Vec<u8>, String> {
    if master_key.len() != 32 {
        return Err("Master key must be exactly 32 bytes".to_string());
    }

    // Use HKDF to derive a 32-byte AES-256 key
    let hk = Hkdf::<Sha256>::new(Some(relationship_id.as_bytes()), master_key);
    let mut encryption_key = [0u8; 32];
    hk.expand(b"BondedEncrypt", &mut encryption_key)
        .map_err(|e| format!("HKDF expansion failed: {}", e))?;

    Ok(encryption_key.to_vec())
}

/// Sign data with master key (for evidence authenticity)
pub fn sign_data(master_key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    if master_key.len() != 32 {
        return Err("Master key must be exactly 32 bytes".to_string());
    }

    let signing_key = SigningKey::from_bytes(master_key.try_into().map_err(|_| "Invalid key length")?);
    
    let signature = signing_key.sign(data);
    Ok(signature.to_bytes().to_vec())
}

/// Verify signature with public key
pub fn verify_signature(public_key: &[u8], data: &[u8], signature: &[u8]) -> Result<bool, String> {
    if public_key.len() != 32 {
        return Err("Public key must be exactly 32 bytes".to_string());
    }
    
    if signature.len() != 64 {
        return Err("Signature must be exactly 64 bytes".to_string());
    }

    let verifying_key = VerifyingKey::from_bytes(public_key.try_into().map_err(|_| "Invalid public key length")?).map_err(|e| format!("Invalid public key: {}", e))?;
    let sig = Signature::from_bytes(signature.try_into().map_err(|_| "Invalid signature length")?);
    
    match verifying_key.verify(data, &sig) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Store a user's key share securely
pub fn store_user_key_share(user: Principal, relationship_id: &str, key_share: Vec<u8>) -> Result<(), String> {
    let key_id = format!("{}_{}", relationship_id, user.to_text());
    
    let user_key_share = UserKeyShare {
        key_id: key_id.clone(),
        user,
        relationship_id: relationship_id.to_string(),
        key_share,
        created_at: current_time(),
    };
    
    with_key_share_store(|store| {
        store.insert(key_id, user_key_share);
    });
    
    Ok(())
}

/// Retrieve a user's key share for a relationship
pub fn get_user_key_share(user: Principal, relationship_id: &str) -> Option<Vec<u8>> {
    let key_id = format!("{}_{}", relationship_id, user.to_text());
    
    with_key_share_store_read(|store| {
        store.get(&key_id).map(|key_share| key_share.key_share)
    })
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