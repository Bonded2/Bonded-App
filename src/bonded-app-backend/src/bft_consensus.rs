use crate::types::*;
use crate::utils::*;
use candid::{CandidType, Principal};
use ic_cdk::api::time;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use sha2::{Digest, Sha256};

// ============================
// BFT CONSENSUS TYPES
// ============================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum BftMessageType {
    Propose,
    Prevote,
    Precommit,
    Commit,
    ViewChange,
    Heartbeat,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftMessage {
    pub message_type: BftMessageType,
    pub view: u64,
    pub sequence: u64,
    pub sender: Principal,
    pub timestamp: u64,
    pub data_hash: Vec<u8>,
    pub signature: Vec<u8>,
    pub payload: Vec<u8>, // Encrypted operation data
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftOperation {
    pub operation_id: String,
    pub operation_type: String,
    pub initiator: Principal,
    pub timestamp: u64,
    pub data: Vec<u8>,
    pub required_signatures: u32,
    pub collected_signatures: Vec<BftSignature>,
    pub status: BftOperationStatus,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum BftOperationStatus {
    Proposed,
    Collecting,
    Committed,
    Rejected,
    TimedOut,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftSignature {
    pub signer: Principal,
    pub signature: Vec<u8>,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftNode {
    pub node_id: Principal,
    pub public_key: Vec<u8>,
    pub reputation_score: u64,
    pub last_heartbeat: u64,
    pub is_active: bool,
    pub byzantine_flags: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftState {
    pub current_view: u64,
    pub current_sequence: u64,
    pub active_nodes: Vec<Principal>,
    pub pending_operations: HashMap<String, BftOperation>,
    pub committed_operations: VecDeque<String>,
    pub byzantine_nodes: HashSet<Principal>,
    pub last_checkpoint: u64,
}

// ============================
// BFT CONSENSUS IMPLEMENTATION
// ============================

impl BftState {
    pub fn new() -> Self {
        Self {
            current_view: 0,
            current_sequence: 0,
            active_nodes: vec![],
            pending_operations: HashMap::new(),
            committed_operations: VecDeque::new(),
            byzantine_nodes: HashSet::new(),
            last_checkpoint: time(),
        }
    }

    pub fn get_fault_tolerance(&self) -> u32 {
        // BFT can tolerate up to f failures where n >= 3f + 1
        ((self.active_nodes.len() as u32).saturating_sub(1)) / 3
    }

    pub fn get_required_signatures(&self) -> u32 {
        // Need 2f + 1 signatures for BFT consensus
        2 * self.get_fault_tolerance() + 1
    }

    pub fn is_byzantine_node(&self, node: &Principal) -> bool {
        self.byzantine_nodes.contains(node)
    }

    pub fn add_byzantine_flag(&mut self, node: Principal, reason: String) {
        self.byzantine_nodes.insert(node);
        ic_cdk::println!("🚨 BYZANTINE BEHAVIOR DETECTED: Node {} - {}", node.to_text(), reason);
    }
}

// ============================
// BFT CONSENSUS PROTOCOL
// ============================

pub struct BftConsensus {
    state: BftState,
    message_log: VecDeque<BftMessage>,
    validator_keys: HashMap<Principal, Vec<u8>>,
}

impl BftConsensus {
    pub fn new() -> Self {
        Self {
            state: BftState::new(),
            message_log: VecDeque::new(),
            validator_keys: HashMap::new(),
        }
    }

    /// Propose a new operation for consensus
    pub fn propose_operation(
        &mut self,
        operation_type: String,
        initiator: Principal,
        data: Vec<u8>,
    ) -> Result<String, String> {
        if self.state.is_byzantine_node(&initiator) {
            return Err("Initiator is flagged as Byzantine node".to_string());
        }

        let operation_id = generate_id("bft_op", time());
        let operation = BftOperation {
            operation_id: operation_id.clone(),
            operation_type,
            initiator,
            timestamp: time(),
            data,
            required_signatures: self.state.get_required_signatures(),
            collected_signatures: vec![],
            status: BftOperationStatus::Proposed,
        };

        self.state.pending_operations.insert(operation_id.clone(), operation);
        
        // Broadcast propose message
        self.broadcast_message(BftMessageType::Propose, &operation_id)?;
        
        Ok(operation_id)
    }

    /// Process incoming BFT message
    pub fn process_message(&mut self, message: BftMessage) -> Result<(), String> {
        // Verify message authenticity
        if !self.verify_message_signature(&message) {
            self.state.add_byzantine_flag(message.sender, "Invalid message signature".to_string());
            return Err("Invalid message signature".to_string());
        }

        // Check for Byzantine behavior patterns
        if self.detect_byzantine_behavior(&message) {
            self.state.add_byzantine_flag(message.sender, "Byzantine behavior detected".to_string());
            return Err("Byzantine behavior detected".to_string());
        }

        // Process based on message type
        match message.message_type {
            BftMessageType::Propose => self.handle_propose(&message),
            BftMessageType::Prevote => self.handle_prevote(&message),
            BftMessageType::Precommit => self.handle_precommit(&message),
            BftMessageType::Commit => self.handle_commit(&message),
            BftMessageType::ViewChange => self.handle_view_change(&message),
            BftMessageType::Heartbeat => self.handle_heartbeat(&message),
        }
    }

    /// Verify integrity of stored data
    pub fn verify_data_integrity(&self, data_hash: &[u8], stored_data: &[u8]) -> bool {
        let computed_hash = Sha256::digest(stored_data);
        computed_hash.as_slice() == data_hash
    }

    /// Create checkpoint for state recovery
    pub fn create_checkpoint(&mut self) -> Result<Vec<u8>, String> {
        let checkpoint_data = BftCheckpoint {
            view: self.state.current_view,
            sequence: self.state.current_sequence,
            committed_ops: self.state.committed_operations.clone(),
            active_nodes: self.state.active_nodes.clone(),
            timestamp: time(),
        };

        match serde_json::to_vec(&checkpoint_data) {
            Ok(data) => {
                self.state.last_checkpoint = time();
                Ok(data)
            }
            Err(e) => Err(format!("Failed to create checkpoint: {}", e)),
        }
    }

    // Private helper methods
    fn broadcast_message(&mut self, msg_type: BftMessageType, operation_id: &str) -> Result<(), String> {
        let message = BftMessage {
            message_type: msg_type,
            view: self.state.current_view,
            sequence: self.state.current_sequence,
            sender: ic_cdk::api::caller(),
            timestamp: time(),
            data_hash: Sha256::digest(operation_id.as_bytes()).to_vec(),
            signature: vec![], // Would be filled with actual signature
            payload: operation_id.as_bytes().to_vec(),
        };

        self.message_log.push_back(message.clone());
        
        // In a real implementation, this would broadcast to all nodes
        ic_cdk::println!("📡 Broadcasting BFT message: {:?} for operation {}", message.message_type, operation_id);
        
        Ok(())
    }

    fn verify_message_signature(&self, message: &BftMessage) -> bool {
        // In production, this would verify the cryptographic signature
        // For now, we'll do basic validation
        !message.signature.is_empty() && 
        message.timestamp > 0 && 
        !message.data_hash.is_empty()
    }

    fn detect_byzantine_behavior(&self, message: &BftMessage) -> bool {
        // Check for various Byzantine behavior patterns
        
        // 1. Check for equivocation (sending conflicting messages)
        let conflicting_messages = self.message_log.iter()
            .filter(|m| m.sender == message.sender && 
                        m.view == message.view && 
                        m.sequence == message.sequence &&
                        m.message_type == message.message_type &&
                        m.data_hash != message.data_hash)
            .count();
        
        if conflicting_messages > 0 {
            return true;
        }

        // 2. Check for message flooding
        let recent_messages = self.message_log.iter()
            .filter(|m| m.sender == message.sender && 
                        time().saturating_sub(m.timestamp) < 1000) // 1 second
            .count();
        
        if recent_messages > 100 {
            return true;
        }

        // 3. Check for invalid view/sequence numbers
        if message.view > self.state.current_view + 1 || 
           message.sequence > self.state.current_sequence + 1 {
            return true;
        }

        false
    }

    fn handle_propose(&mut self, message: &BftMessage) -> Result<(), String> {
        ic_cdk::println!("🏛️ Handling PROPOSE message from {}", message.sender.to_text());
        
        // Extract operation ID from payload
        let operation_id = String::from_utf8_lossy(&message.payload);
        let operation_id_string = operation_id.to_string();
        
        if let Some(operation) = self.state.pending_operations.get_mut(&operation_id_string) {
            // Sign the operation if we agree with it
            let signature_result = self.sign_operation(&operation_id_string);
            match signature_result {
                Ok(sig) => {
                    let signature = BftSignature {
                        signer: ic_cdk::api::caller(),
                        signature: sig,
                        timestamp: time(),
                    };
                    
                    operation.collected_signatures.push(signature);
                    operation.status = BftOperationStatus::Collecting;
                    
                    // Broadcast prevote
                    self.broadcast_message(BftMessageType::Prevote, &operation_id_string)?;
                },
                Err(e) => return Err(e),
            }
        }
        
        Ok(())
    }

    fn handle_prevote(&mut self, message: &BftMessage) -> Result<(), String> {
        ic_cdk::println!("✅ Handling PREVOTE message from {}", message.sender.to_text());
        
        let operation_id = String::from_utf8_lossy(&message.payload);
        
        if let Some(operation) = self.state.pending_operations.get_mut(&operation_id.to_string()) {
            // Check if we have enough prevotes
            if operation.collected_signatures.len() >= operation.required_signatures as usize {
                // Broadcast precommit
                self.broadcast_message(BftMessageType::Precommit, &operation_id)?;
            }
        }
        
        Ok(())
    }

    fn handle_precommit(&mut self, message: &BftMessage) -> Result<(), String> {
        ic_cdk::println!("🔒 Handling PRECOMMIT message from {}", message.sender.to_text());
        
        let operation_id = String::from_utf8_lossy(&message.payload);
        
        if let Some(operation) = self.state.pending_operations.get_mut(&operation_id.to_string()) {
            // Check if we have enough precommits
            if operation.collected_signatures.len() >= operation.required_signatures as usize {
                // Commit the operation
                operation.status = BftOperationStatus::Committed;
                self.state.committed_operations.push_back(operation_id.to_string());
                self.state.current_sequence += 1;
                
                // Broadcast commit
                self.broadcast_message(BftMessageType::Commit, &operation_id)?;
            }
        }
        
        Ok(())
    }

    fn handle_commit(&mut self, message: &BftMessage) -> Result<(), String> {
        ic_cdk::println!("✅ Handling COMMIT message from {}", message.sender.to_text());
        
        let operation_id = String::from_utf8_lossy(&message.payload);
        
        // Execute the committed operation
        if let Some(operation) = self.state.pending_operations.get(&operation_id.to_string()) {
            self.execute_operation(operation)?;
        }
        
        Ok(())
    }

    fn handle_view_change(&mut self, message: &BftMessage) -> Result<(), String> {
        ic_cdk::println!("🔄 Handling VIEW_CHANGE message from {}", message.sender.to_text());
        
        // Implement view change protocol for leader election
        if message.view > self.state.current_view {
            self.state.current_view = message.view;
            ic_cdk::println!("📈 Updated to view {}", self.state.current_view);
        }
        
        Ok(())
    }

    fn handle_heartbeat(&mut self, message: &BftMessage) -> Result<(), String> {
        // Update node liveness information
        if !self.state.active_nodes.contains(&message.sender) {
            self.state.active_nodes.push(message.sender);
        }
        
        Ok(())
    }

    fn sign_operation(&self, operation_id: &str) -> Result<Vec<u8>, String> {
        // In production, this would create a cryptographic signature
        // For now, we'll create a simple hash-based signature
        let signature_data = format!("{}:{}", ic_cdk::api::caller().to_text(), operation_id);
        Ok(Sha256::digest(signature_data.as_bytes()).to_vec())
    }

    fn execute_operation(&self, operation: &BftOperation) -> Result<(), String> {
        ic_cdk::println!("⚡ Executing BFT operation: {} ({})", operation.operation_id, operation.operation_type);
        
        // The actual operation execution would happen here
        // This is where the evidence upload, relationship creation, etc. would occur
        
        Ok(())
    }
}

// ============================
// BFT CHECKPOINT SYSTEM
// ============================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BftCheckpoint {
    pub view: u64,
    pub sequence: u64,
    pub committed_ops: VecDeque<String>,
    pub active_nodes: Vec<Principal>,
    pub timestamp: u64,
}

// ============================
// BFT UTILITY FUNCTIONS
// ============================

pub fn compute_merkle_root(data_hashes: &[Vec<u8>]) -> Vec<u8> {
    if data_hashes.is_empty() {
        return Vec::new();
    }
    
    if data_hashes.len() == 1 {
        return data_hashes[0].clone();
    }
    
    let mut current_level = data_hashes.to_vec();
    
    while current_level.len() > 1 {
        let mut next_level = Vec::new();
        
        for chunk in current_level.chunks(2) {
            let combined = if chunk.len() == 2 {
                [chunk[0].clone(), chunk[1].clone()].concat()
            } else {
                [chunk[0].clone(), chunk[0].clone()].concat() // Duplicate if odd
            };
            
            next_level.push(Sha256::digest(&combined).to_vec());
        }
        
        current_level = next_level;
    }
    
    current_level[0].clone()
}

pub fn verify_merkle_proof(
    leaf_hash: &[u8],
    proof: &[Vec<u8>],
    root: &[u8],
    index: usize,
) -> bool {
    let mut current_hash = leaf_hash.to_vec();
    let mut current_index = index;
    
    for sibling in proof {
        let combined = if current_index % 2 == 0 {
            [current_hash, sibling.clone()].concat()
        } else {
            [sibling.clone(), current_hash].concat()
        };
        
        current_hash = Sha256::digest(&combined).to_vec();
        current_index /= 2;
    }
    
    current_hash == root
}

// ============================
// BFT MONITORING SYSTEM
// ============================

pub struct BftMonitor {
    pub performance_metrics: HashMap<Principal, BftNodeMetrics>,
    pub alert_thresholds: BftAlertThresholds,
}

#[derive(Clone, Debug)]
pub struct BftNodeMetrics {
    pub messages_sent: u64,
    pub messages_received: u64,
    pub operations_proposed: u64,
    pub operations_committed: u64,
    pub byzantine_flags: u64,
    pub response_time_avg: f64,
    pub uptime_percentage: f64,
}

#[derive(Clone, Debug)]
pub struct BftAlertThresholds {
    pub max_byzantine_flags: u64,
    pub min_uptime_percentage: f64,
    pub max_response_time: f64,
    pub max_message_rate: u64,
}

impl BftMonitor {
    pub fn new() -> Self {
        Self {
            performance_metrics: HashMap::new(),
            alert_thresholds: BftAlertThresholds {
                max_byzantine_flags: 3,
                min_uptime_percentage: 95.0,
                max_response_time: 5.0,
                max_message_rate: 1000,
            },
        }
    }

    pub fn check_node_health(&self, node: &Principal) -> Vec<String> {
        let mut alerts = Vec::new();
        
        if let Some(metrics) = self.performance_metrics.get(node) {
            if metrics.byzantine_flags > self.alert_thresholds.max_byzantine_flags {
                alerts.push("Excessive Byzantine behavior detected".to_string());
            }
            
            if metrics.uptime_percentage < self.alert_thresholds.min_uptime_percentage {
                alerts.push("Low uptime detected".to_string());
            }
            
            if metrics.response_time_avg > self.alert_thresholds.max_response_time {
                alerts.push("High response time detected".to_string());
            }
        }
        
        alerts
    }
}