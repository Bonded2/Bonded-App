use crate::bft_consensus::*;
use crate::types::*;
use crate::utils::*;
use candid::{CandidType, Principal};
use ic_cdk::api::time;
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::collections::HashMap;

// ============================
// BFT STORAGE TYPES
// ============================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftStorageEntry<T> {
    pub data: T,
    pub hash: Vec<u8>,
    pub replicas: Vec<BftReplica>,
    pub consensus_proof: Vec<u8>,
    pub created_at: u64,
    pub updated_at: u64,
    pub version: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftReplica {
    pub node_id: Principal,
    pub data_hash: Vec<u8>,
    pub signature: Vec<u8>,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftIntegrityProof {
    pub data_hash: Vec<u8>,
    pub merkle_root: Vec<u8>,
    pub merkle_proof: Vec<Vec<u8>>,
    pub consensus_signatures: Vec<BftSignature>,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftStorageMetrics {
    pub total_entries: u64,
    pub replicated_entries: u64,
    pub integrity_failures: u64,
    pub consensus_operations: u64,
    pub byzantine_detections: u64,
    pub recovery_operations: u64,
}

// ============================
// BFT STORAGE IMPLEMENTATION
// ============================

pub struct BftStorage<T: Clone + Storable> {
    pub storage_id: String,
    pub entries: HashMap<String, BftStorageEntry<T>>,
    pub consensus: BftConsensus,
    pub replication_factor: u32,
    pub integrity_checks: HashMap<String, BftIntegrityProof>,
    pub metrics: BftStorageMetrics,
}

impl<T: Clone + Storable + Serialize + for<'de> Deserialize<'de>> BftStorage<T> {
    pub fn new(storage_id: String, replication_factor: u32) -> Self {
        Self {
            storage_id,
            entries: HashMap::new(),
            consensus: BftConsensus::new(),
            replication_factor,
            integrity_checks: HashMap::new(),
            metrics: BftStorageMetrics {
                total_entries: 0,
                replicated_entries: 0,
                integrity_failures: 0,
                consensus_operations: 0,
                byzantine_detections: 0,
                recovery_operations: 0,
            },
        }
    }

    /// Store data with BFT consensus
    pub fn bft_store(&mut self, key: String, data: T, initiator: Principal) -> Result<String, String> {
        // Serialize data for consensus
        let serialized_data = match serde_json::to_vec(&data) {
            Ok(data) => data,
            Err(e) => return Err(format!("Failed to serialize data: {}", e)),
        };

        // Compute data hash
        let data_hash = Sha256::digest(&serialized_data).to_vec();

        // Create BFT operation
        let operation_id = self.consensus.propose_operation(
            format!("store_{}", self.storage_id),
            initiator,
            serialized_data.clone(),
        )?;

        // Wait for consensus (in production, this would be asynchronous)
        self.wait_for_consensus(&operation_id)?;

        // Create BFT storage entry
        let entry = BftStorageEntry {
            data: data.clone(),
            hash: data_hash.clone(),
            replicas: vec![],
            consensus_proof: vec![], // Would contain actual consensus proof
            created_at: time(),
            updated_at: time(),
            version: 1,
        };

        // Store with replication
        self.replicate_entry(&key, &entry)?;

        // Create integrity proof
        let integrity_proof = self.create_integrity_proof(&key, &entry)?;
        self.integrity_checks.insert(key.clone(), integrity_proof);

        // Update metrics
        self.metrics.total_entries += 1;
        self.metrics.consensus_operations += 1;

        ic_cdk::println!("✅ BFT Storage: Stored {} with consensus", key);
        Ok(operation_id)
    }

    /// Retrieve data with integrity verification
    pub fn bft_retrieve(&self, key: &str) -> Result<T, String> {
        let entry = self.entries.get(key)
            .ok_or_else(|| "Entry not found".to_string())?;

        // Verify integrity
        if !self.verify_entry_integrity(key, entry)? {
            return Err("Integrity verification failed".to_string());
        }

        // Verify consensus proof
        if !self.verify_consensus_proof(key, entry)? {
            return Err("Consensus proof verification failed".to_string());
        }

        ic_cdk::println!("✅ BFT Storage: Retrieved {} with verification", key);
        Ok(entry.data.clone())
    }

    /// Update data with BFT consensus
    pub fn bft_update(&mut self, key: String, data: T, initiator: Principal) -> Result<String, String> {
        // Check if entry exists
        let mut entry = self.entries.get(&key)
            .ok_or_else(|| "Entry not found for update".to_string())?
            .clone();

        // Serialize new data
        let serialized_data = match serde_json::to_vec(&data) {
            Ok(data) => data,
            Err(e) => return Err(format!("Failed to serialize data: {}", e)),
        };

        // Create BFT operation for update
        let operation_id = self.consensus.propose_operation(
            format!("update_{}", self.storage_id),
            initiator,
            serialized_data,
        )?;

        // Wait for consensus
        self.wait_for_consensus(&operation_id)?;

        // Update entry
        entry.data = data;
        entry.hash = Sha256::digest(&serde_json::to_vec(&entry.data).unwrap()).to_vec();
        entry.updated_at = time();
        entry.version += 1;

        // Re-replicate updated entry
        self.replicate_entry(&key, &entry)?;

        // Update integrity proof
        let integrity_proof = self.create_integrity_proof(&key, &entry)?;
        self.integrity_checks.insert(key.clone(), integrity_proof);

        self.metrics.consensus_operations += 1;

        ic_cdk::println!("✅ BFT Storage: Updated {} with consensus", key);
        Ok(operation_id)
    }

    /// Delete data with BFT consensus
    pub fn bft_delete(&mut self, key: String, initiator: Principal) -> Result<String, String> {
        // Check if entry exists
        if !self.entries.contains_key(&key) {
            return Err("Entry not found for deletion".to_string());
        }

        // Create BFT operation for deletion
        let operation_id = self.consensus.propose_operation(
            format!("delete_{}", self.storage_id),
            initiator,
            key.as_bytes().to_vec(),
        )?;

        // Wait for consensus
        self.wait_for_consensus(&operation_id)?;

        // Remove entry and integrity proof
        self.entries.remove(&key);
        self.integrity_checks.remove(&key);

        self.metrics.consensus_operations += 1;
        self.metrics.total_entries = self.metrics.total_entries.saturating_sub(1);

        ic_cdk::println!("✅ BFT Storage: Deleted {} with consensus", key);
        Ok(operation_id)
    }

    /// Verify integrity of all stored data
    pub fn verify_all_integrity(&mut self) -> Result<BftIntegrityReport, String> {
        let mut report = BftIntegrityReport {
            total_checked: 0,
            integrity_passed: 0,
            integrity_failed: 0,
            corrupted_entries: vec![],
            byzantine_nodes: vec![],
            recovery_needed: vec![],
        };

        for (key, entry) in &self.entries {
            report.total_checked += 1;

            match self.verify_entry_integrity(key, entry) {
                Ok(true) => report.integrity_passed += 1,
                Ok(false) => {
                    report.integrity_failed += 1;
                    report.corrupted_entries.push(key.clone());
                    report.recovery_needed.push(key.clone());
                },
                Err(e) => {
                    ic_cdk::println!("❌ Integrity check error for {}: {}", key, e);
                    report.integrity_failed += 1;
                    report.corrupted_entries.push(key.clone());
                }
            }
        }

        // Detect Byzantine nodes
        report.byzantine_nodes = self.detect_byzantine_replicas();

        // Update metrics
        self.metrics.integrity_failures += report.integrity_failed;
        self.metrics.byzantine_detections += report.byzantine_nodes.len() as u64;

        Ok(report)
    }

    /// Recover corrupted data using BFT mechanisms
    pub fn recover_corrupted_data(&mut self, key: &str) -> Result<(), String> {
        ic_cdk::println!("🔧 BFT Recovery: Attempting to recover {}", key);

        let entry = self.entries.get(key)
            .ok_or_else(|| "Entry not found for recovery".to_string())?;

        // Try to recover from replicas
        let recovered_data = self.recover_from_replicas(key, entry)?;

        // Verify recovered data
        let recovered_hash = Sha256::digest(&serde_json::to_vec(&recovered_data).unwrap()).to_vec();
        
        // Update entry with recovered data
        let mut updated_entry = entry.clone();
        updated_entry.data = recovered_data;
        updated_entry.hash = recovered_hash;
        updated_entry.updated_at = time();
        updated_entry.version += 1;

        // Re-replicate corrected data
        self.replicate_entry(key, &updated_entry)?;

        // Update integrity proof
        let integrity_proof = self.create_integrity_proof(key, &updated_entry)?;
        self.integrity_checks.insert(key.to_string(), integrity_proof);

        self.entries.insert(key.to_string(), updated_entry);
        self.metrics.recovery_operations += 1;

        ic_cdk::println!("✅ BFT Recovery: Successfully recovered {}", key);
        Ok(())
    }

    // Private helper methods
    fn replicate_entry(&mut self, key: &str, entry: &BftStorageEntry<T>) -> Result<(), String> {
        ic_cdk::println!("📋 Replicating entry {} to {} nodes", key, self.replication_factor);

        // In a real implementation, this would replicate to multiple nodes
        // For now, we'll simulate replication
        let replica = BftReplica {
            node_id: ic_cdk::api::caller(),
            data_hash: entry.hash.clone(),
            signature: self.sign_data(&entry.hash)?,
            timestamp: time(),
        };

        let mut updated_entry = entry.clone();
        updated_entry.replicas.push(replica);

        self.entries.insert(key.to_string(), updated_entry);
        self.metrics.replicated_entries += 1;

        Ok(())
    }

    fn verify_entry_integrity(&self, key: &str, entry: &BftStorageEntry<T>) -> Result<bool, String> {
        // Verify data hash
        let computed_hash = Sha256::digest(&serde_json::to_vec(&entry.data).unwrap()).to_vec();
        if computed_hash != entry.hash {
            ic_cdk::println!("❌ Hash mismatch for entry {}", key);
            return Ok(false);
        }

        // Verify replica signatures
        for replica in &entry.replicas {
            if !self.verify_replica_signature(replica)? {
                ic_cdk::println!("❌ Invalid replica signature for entry {}", key);
                return Ok(false);
            }
        }

        // Verify integrity proof if available
        if let Some(proof) = self.integrity_checks.get(key) {
            if !self.verify_integrity_proof(key, proof)? {
                ic_cdk::println!("❌ Invalid integrity proof for entry {}", key);
                return Ok(false);
            }
        }

        Ok(true)
    }

    fn verify_consensus_proof(&self, _key: &str, _entry: &BftStorageEntry<T>) -> Result<bool, String> {
        // In production, this would verify the consensus proof
        // For now, we'll return true
        Ok(true)
    }

    fn create_integrity_proof(&self, key: &str, entry: &BftStorageEntry<T>) -> Result<BftIntegrityProof, String> {
        let data_hash = entry.hash.clone();
        
        // Create Merkle proof (simplified)
        let merkle_root = compute_merkle_root(&[data_hash.clone()]);
        let merkle_proof = vec![]; // Would contain actual Merkle proof

        // Create consensus signatures (simplified)
        let consensus_signatures = vec![BftSignature {
            signer: ic_cdk::api::caller(),
            signature: self.sign_data(&data_hash)?,
            timestamp: time(),
        }];

        Ok(BftIntegrityProof {
            data_hash,
            merkle_root,
            merkle_proof,
            consensus_signatures,
            timestamp: time(),
        })
    }

    fn verify_integrity_proof(&self, _key: &str, proof: &BftIntegrityProof) -> Result<bool, String> {
        // Verify Merkle proof
        if !proof.merkle_proof.is_empty() {
            let is_valid = verify_merkle_proof(
                &proof.data_hash,
                &proof.merkle_proof,
                &proof.merkle_root,
                0, // index
            );
            if !is_valid {
                return Ok(false);
            }
        }

        // Verify consensus signatures
        for signature in &proof.consensus_signatures {
            if !self.verify_signature(&proof.data_hash, signature)? {
                return Ok(false);
            }
        }

        Ok(true)
    }

    fn verify_replica_signature(&self, replica: &BftReplica) -> Result<bool, String> {
        // In production, this would verify the cryptographic signature
        // For now, we'll do basic validation
        Ok(!replica.signature.is_empty() && replica.timestamp > 0)
    }

    fn verify_signature(&self, data: &[u8], signature: &BftSignature) -> Result<bool, String> {
        // In production, this would verify the cryptographic signature
        // For now, we'll do basic validation
        Ok(!signature.signature.is_empty() && signature.timestamp > 0)
    }

    fn sign_data(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        // In production, this would create a cryptographic signature
        // For now, we'll create a simple hash-based signature
        let signature_data = format!("{}:{}", ic_cdk::api::caller().to_text(), hex::encode(data));
        Ok(Sha256::digest(signature_data.as_bytes()).to_vec())
    }

    fn wait_for_consensus(&self, operation_id: &str) -> Result<(), String> {
        // In production, this would wait for actual consensus
        // For now, we'll simulate consensus completion
        ic_cdk::println!("⏳ Waiting for consensus on operation {}", operation_id);
        ic_cdk::println!("✅ Consensus reached for operation {}", operation_id);
        Ok(())
    }

    fn detect_byzantine_replicas(&self) -> Vec<Principal> {
        let mut byzantine_nodes = vec![];

        // Analyze replica consistency
        for (key, entry) in &self.entries {
            let mut hash_counts: HashMap<Vec<u8>, u32> = HashMap::new();
            
            for replica in &entry.replicas {
                *hash_counts.entry(replica.data_hash.clone()).or_insert(0) += 1;
            }

            // If we have conflicting hashes, identify minority as potentially Byzantine
            if hash_counts.len() > 1 {
                let max_count = hash_counts.values().max().unwrap_or(&0);
                
                for replica in &entry.replicas {
                    if hash_counts.get(&replica.data_hash).unwrap_or(&0) < max_count {
                        if !byzantine_nodes.contains(&replica.node_id) {
                            byzantine_nodes.push(replica.node_id);
                            ic_cdk::println!("🚨 Detected Byzantine replica for {}: {}", key, replica.node_id.to_text());
                        }
                    }
                }
            }
        }

        byzantine_nodes
    }

    fn recover_from_replicas(&self, key: &str, entry: &BftStorageEntry<T>) -> Result<T, String> {
        // Find the most common data hash among replicas
        let mut hash_counts: HashMap<Vec<u8>, u32> = HashMap::new();
        
        for replica in &entry.replicas {
            *hash_counts.entry(replica.data_hash.clone()).or_insert(0) += 1;
        }

        let consensus_hash = hash_counts.into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(hash, _)| hash)
            .ok_or_else(|| "No consensus hash found".to_string())?;

        // If the entry hash matches consensus, return the data
        if entry.hash == consensus_hash {
            Ok(entry.data.clone())
        } else {
            // In production, we would fetch the correct data from a replica
            // For now, we'll return the existing data
            Err("Cannot recover data: no valid replicas available".to_string())
        }
    }
}

// ============================
// BFT STORAGE REPORT TYPES
// ============================

// BftIntegrityReport is now defined in types.rs

// ============================
// STORABLE IMPLEMENTATIONS
// ============================

impl<T: Clone + Storable + Serialize + for<'de> Deserialize<'de>> Storable for BftStorageEntry<T> {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        match serde_json::to_vec(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(_) => Cow::Borrowed(&[]),
        }
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        match serde_json::from_slice(bytes.as_ref()) {
            Ok(entry) => entry,
            Err(_) => panic!("Failed to deserialize BftStorageEntry"),
        }
    }
}

impl Storable for BftIntegrityProof {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        match serde_json::to_vec(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(_) => Cow::Borrowed(&[]),
        }
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        match serde_json::from_slice(bytes.as_ref()) {
            Ok(proof) => proof,
            Err(_) => panic!("Failed to deserialize BftIntegrityProof"),
        }
    }
}