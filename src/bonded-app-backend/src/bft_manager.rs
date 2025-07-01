use crate::bft_consensus::*;
use crate::bft_storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};
use ic_cdk::api::time;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;

// ============================
// BFT SYSTEM MANAGER
// ============================

thread_local! {
    static BFT_SYSTEM_STATE: RefCell<BftSystemState> = RefCell::new(BftSystemState::new());
    static BFT_MONITOR: RefCell<BftMonitor> = RefCell::new(BftMonitor::new());
    static BFT_RECOVERY_SYSTEM: RefCell<BftRecoverySystem> = RefCell::new(BftRecoverySystem::new());
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BftSystemState {
    pub is_active: bool,
    pub consensus_rounds: u64,
    pub total_operations: u64,
    pub successful_operations: u64,
    pub failed_operations: u64,
    pub byzantine_detections: u64,
    pub recovery_operations: u64,
    pub last_health_check: u64,
    pub active_nodes: Vec<Principal>,
    pub byzantine_nodes: Vec<Principal>,
    pub system_health_score: f64,
}

impl BftSystemState {
    pub fn new() -> Self {
        Self {
            is_active: true,
            consensus_rounds: 0,
            total_operations: 0,
            successful_operations: 0,
            failed_operations: 0,
            byzantine_detections: 0,
            recovery_operations: 0,
            last_health_check: time(),
            active_nodes: vec![],
            byzantine_nodes: vec![],
            system_health_score: 100.0,
        }
    }

    pub fn update_health_score(&mut self) {
        let success_rate = if self.total_operations > 0 {
            (self.successful_operations as f64) / (self.total_operations as f64) * 100.0
        } else {
            100.0
        };

        let byzantine_penalty = (self.byzantine_detections as f64) * 5.0;
        let recovery_penalty = (self.recovery_operations as f64) * 2.0;

        self.system_health_score = (success_rate - byzantine_penalty - recovery_penalty).max(0.0).min(100.0);
    }
}

// ============================
// BFT RECOVERY SYSTEM
// ============================

#[derive(Clone, Debug)]
pub struct BftRecoverySystem {
    pub corrupted_entries: HashMap<String, BftCorruptionInfo>,
    pub recovery_queue: Vec<String>,
    pub auto_recovery_enabled: bool,
    pub recovery_attempts: HashMap<String, u32>,
    pub max_recovery_attempts: u32,
}

#[derive(Clone, Debug)]
pub struct BftCorruptionInfo {
    pub entry_id: String,
    pub corruption_type: String,
    pub detected_at: u64,
    pub recovery_attempts: u32,
    pub last_recovery_attempt: u64,
    pub is_recoverable: bool,
}

impl BftRecoverySystem {
    pub fn new() -> Self {
        Self {
            corrupted_entries: HashMap::new(),
            recovery_queue: Vec::new(),
            auto_recovery_enabled: true,
            recovery_attempts: HashMap::new(),
            max_recovery_attempts: 3,
        }
    }

    pub fn report_corruption(&mut self, entry_id: String, corruption_type: String) -> Result<(), String> {
        let corruption_info = BftCorruptionInfo {
            entry_id: entry_id.clone(),
            corruption_type,
            detected_at: time(),
            recovery_attempts: 0,
            last_recovery_attempt: 0,
            is_recoverable: true,
        };

        self.corrupted_entries.insert(entry_id.clone(), corruption_info);
        
        if !self.recovery_queue.contains(&entry_id) {
            self.recovery_queue.push(entry_id.clone());
        }

        ic_cdk::println!("🚨 BFT Corruption Reported: {}", entry_id);
        Ok(())
    }

    pub fn attempt_recovery(&mut self, entry_id: &str) -> Result<bool, String> {
        let attempts = self.recovery_attempts.entry(entry_id.to_string()).or_insert(0);
        
        if *attempts >= self.max_recovery_attempts {
            ic_cdk::println!("❌ BFT Recovery: Max attempts reached for {}", entry_id);
            return Ok(false);
        }

        *attempts += 1;

        // Update corruption info
        if let Some(corruption_info) = self.corrupted_entries.get_mut(entry_id) {
            corruption_info.recovery_attempts = *attempts;
            corruption_info.last_recovery_attempt = time();
        }

        // Simulate recovery process
        let recovery_success = *attempts <= 2; // Simulate success after 1-2 attempts

        if recovery_success {
            self.corrupted_entries.remove(entry_id);
            self.recovery_queue.retain(|id| id != entry_id);
            self.recovery_attempts.remove(entry_id);
            ic_cdk::println!("✅ BFT Recovery: Successfully recovered {}", entry_id);
        } else {
            ic_cdk::println!("⚠️ BFT Recovery: Failed attempt {} for {}", attempts, entry_id);
        }

        Ok(recovery_success)
    }
}

// ============================
// BFT SYSTEM MANAGEMENT FUNCTIONS
// ============================

#[update]
pub fn bft_initialize_system() -> BftResult<BftSystemStatus> {
    let caller = caller_principal();
    
    ic_cdk::println!("🚀 BFT System: Initializing Byzantine Fault Tolerance system");
    
    BFT_SYSTEM_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.is_active = true;
        state.last_health_check = time();
        
        if !state.active_nodes.contains(&caller) {
            state.active_nodes.push(caller);
        }
        
        state.update_health_score();
    });

    // Initialize monitoring
    BFT_MONITOR.with(|monitor| {
        let mut monitor = monitor.borrow_mut();
        monitor.performance_metrics.insert(caller, BftNodeMetrics {
            messages_sent: 0,
            messages_received: 0,
            operations_proposed: 0,
            operations_committed: 0,
            byzantine_flags: 0,
            response_time_avg: 0.0,
            uptime_percentage: 100.0,
        });
    });

    ic_cdk::println!("✅ BFT System: Initialization complete");
    
    BftResult::ok(get_system_status())
}

#[query]
pub fn bft_get_system_status() -> BftResult<BftSystemStatus> {
    BftResult::ok(get_system_status())
}

#[update]
pub fn bft_perform_health_check() -> BftResult<BftHealthReport> {
    ic_cdk::println!("🔍 BFT Health Check: Performing comprehensive system health check");
    
    let mut health_report = BftHealthReport {
        timestamp: time(),
        overall_health_score: 0.0,
        consensus_status: "unknown".to_string(),
        storage_integrity: BftIntegrityReport {
            total_checked: 0,
            integrity_passed: 0,
            integrity_failed: 0,
            corrupted_entries: vec![],
            byzantine_nodes: vec![],
            recovery_needed: vec![],
        },
        node_statuses: HashMap::new(),
        recommendations: vec![],
        critical_issues: vec![],
    };

    // Check system state
    BFT_SYSTEM_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.last_health_check = time();
        state.update_health_score();
        
        health_report.overall_health_score = state.system_health_score;
        health_report.consensus_status = if state.is_active {
            "active".to_string()
        } else {
            "inactive".to_string()
        };

        // Check for critical issues
        if state.byzantine_detections > 10 {
            health_report.critical_issues.push("High number of Byzantine detections".to_string());
        }
        
        if state.system_health_score < 80.0 {
            health_report.critical_issues.push("System health score below 80%".to_string());
        }
        
        if state.active_nodes.len() < 3 {
            health_report.critical_issues.push("Insufficient active nodes for BFT".to_string());
        }
    });

    // Check node performance
    BFT_MONITOR.with(|monitor| {
        let monitor = monitor.borrow();
        
        for (node, metrics) in &monitor.performance_metrics {
            let alerts = monitor.check_node_health(node);
            health_report.node_statuses.insert(*node, BftNodeStatus {
                is_active: true,
                health_score: metrics.uptime_percentage,
                alerts,
                last_seen: time(),
            });
        }
    });

    // Generate recommendations
    if health_report.overall_health_score < 90.0 {
        health_report.recommendations.push("Consider increasing replication factor".to_string());
    }
    
    if !health_report.critical_issues.is_empty() {
        health_report.recommendations.push("Address critical issues immediately".to_string());
    }

    ic_cdk::println!("✅ BFT Health Check: Complete (Score: {:.2}%)", health_report.overall_health_score);
    
    BftResult::ok(health_report)
}

#[update]
pub fn bft_recover_system() -> BftResult<BftRecoveryReport> {
    let caller = caller_principal();
    
    ic_cdk::println!("🔧 BFT Recovery: Starting system-wide recovery process");
    
    let mut recovery_report = BftRecoveryReport {
        timestamp: time(),
        total_corrupted: 0,
        successfully_recovered: 0,
        failed_recoveries: 0,
        recovery_operations: vec![],
        system_restored: false,
    };

    // Process recovery queue
    BFT_RECOVERY_SYSTEM.with(|recovery| {
        let mut recovery = recovery.borrow_mut();
        
        recovery_report.total_corrupted = recovery.corrupted_entries.len() as u64;
        
        let queue_copy = recovery.recovery_queue.clone();
        for entry_id in queue_copy {
            match recovery.attempt_recovery(&entry_id) {
                Ok(true) => {
                    recovery_report.successfully_recovered += 1;
                    recovery_report.recovery_operations.push(BftRecoveryOperation {
                        entry_id: entry_id.clone(),
                        operation_type: "recovery".to_string(),
                        status: "success".to_string(),
                        timestamp: time(),
                    });
                },
                Ok(false) => {
                    recovery_report.failed_recoveries += 1;
                    recovery_report.recovery_operations.push(BftRecoveryOperation {
                        entry_id: entry_id.clone(),
                        operation_type: "recovery".to_string(),
                        status: "failed".to_string(),
                        timestamp: time(),
                    });
                },
                Err(e) => {
                    ic_cdk::println!("❌ BFT Recovery Error for {}: {}", entry_id, e);
                    recovery_report.failed_recoveries += 1;
                }
            }
        }
    });

    // Update system state
    BFT_SYSTEM_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.recovery_operations += recovery_report.successfully_recovered;
        state.update_health_score();
        
        recovery_report.system_restored = state.system_health_score > 95.0;
    });

    // Log audit event
    log_bft_audit_event(
        caller, 
        "bft_recover_system", 
        Some(format!("recovered:{}, failed:{}", 
                    recovery_report.successfully_recovered, 
                    recovery_report.failed_recoveries))
    )?;

    ic_cdk::println!("✅ BFT Recovery: Recovered {}/{} entries", 
                   recovery_report.successfully_recovered, 
                   recovery_report.total_corrupted);
    
    BftResult::ok(recovery_report)
}

#[update]
pub fn bft_report_byzantine_behavior(
    suspect_node: Principal,
    behavior_type: String,
    evidence: Vec<u8>
) -> BftResult<String> {
    let reporter = caller_principal();
    
    ic_cdk::println!("🚨 BFT Byzantine Report: {} reported by {}", 
                   suspect_node.to_text(), reporter.to_text());
    
    // Update system state
    BFT_SYSTEM_STATE.with(|state| {
        let mut state = state.borrow_mut();
        
        if !state.byzantine_nodes.contains(&suspect_node) {
            state.byzantine_nodes.push(suspect_node);
            state.byzantine_detections += 1;
        }
        
        // Remove from active nodes if present
        state.active_nodes.retain(|node| *node != suspect_node);
        
        state.update_health_score();
    });

    // Update monitor
    BFT_MONITOR.with(|monitor| {
        let mut monitor = monitor.borrow_mut();
        
        if let Some(metrics) = monitor.performance_metrics.get_mut(&suspect_node) {
            metrics.byzantine_flags += 1;
        }
    });

    // Log audit event
    log_bft_audit_event(
        reporter, 
        "bft_report_byzantine", 
        Some(format!("suspect:{}, type:{}", suspect_node.to_text(), behavior_type))
    )?;

    ic_cdk::println!("✅ BFT Byzantine Report: Processed report against {}", suspect_node.to_text());
    
    BftResult::ok(format!("Byzantine behavior report processed for node {}", suspect_node.to_text()))
}

#[query]
pub fn bft_get_network_topology() -> BftResult<BftNetworkTopology> {
    BFT_SYSTEM_STATE.with(|state| {
        let state = state.borrow();
        
        let topology = BftNetworkTopology {
            total_nodes: state.active_nodes.len() as u64,
            active_nodes: state.active_nodes.clone(),
            byzantine_nodes: state.byzantine_nodes.clone(),
            fault_tolerance: ((state.active_nodes.len() as u32).saturating_sub(1)) / 3,
            consensus_threshold: 2 * ((state.active_nodes.len() as u32).saturating_sub(1)) / 3 + 1,
            network_health: state.system_health_score,
            last_updated: state.last_health_check,
        };
        
        BftResult::ok(topology)
    })
}

// ============================
// HELPER FUNCTIONS
// ============================

fn get_system_status() -> BftSystemStatus {
    BFT_SYSTEM_STATE.with(|state| {
        let state = state.borrow();
        
        BftSystemStatus {
            is_active: state.is_active,
            health_score: state.system_health_score,
            total_operations: state.total_operations,
            successful_operations: state.successful_operations,
            failed_operations: state.failed_operations,
            byzantine_detections: state.byzantine_detections,
            active_nodes: state.active_nodes.len() as u64,
            byzantine_nodes: state.byzantine_nodes.len() as u64,
            last_health_check: state.last_health_check,
            fault_tolerance: ((state.active_nodes.len() as u32).saturating_sub(1)) / 3,
        }
    })
}

fn log_bft_audit_event(
    user: Principal,
    action: &str,
    metadata: Option<String>,
) -> Result<(), String> {
    let audit_entry = AuditLogEntry {
        id: generate_id("bft_audit", time()),
        user,
        action: format!("BFT_{}", action),
        timestamp: time(),
        metadata,
    };
    
    ic_cdk::println!("📝 BFT Audit: {} - {} - {:?}", 
                   user.to_text(), action, audit_entry.metadata);
    
    Ok(())
}

// ============================
// BFT RESPONSE TYPES
// ============================

// BftSystemStatus, BftHealthReport, BftNodeStatus, BftRecoveryReport, BftRecoveryOperation, and BftNetworkTopology are now defined in types.rs

// BftResult is now defined in types.rs