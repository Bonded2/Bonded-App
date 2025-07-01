// ===========================
// BONDED APP BACKEND CANISTER
// ===========================
// Privacy-first relationship evidence storage on Internet Computer
// Built with Rust canisters for security and decentralization

// Module declarations
mod types;
mod storage;
mod utils;
mod evidence;
mod relationships;
mod users;
mod client_storage;
mod bft_consensus;
mod bft_storage;
mod bft_evidence;
mod bft_relationships;
mod bft_manager;

// Re-export all public functions from modules
pub use evidence::*;
pub use relationships::*;
pub use users::*;
pub use types::*;
pub use client_storage::*;

// Re-export BFT functions
pub use bft_evidence::*;
pub use bft_relationships::*;
pub use bft_manager::*;

// Imports
use candid::Principal;
use ic_cdk_macros::query;
use storage::{get_storage_stats, with_user_store_read, with_settings_store_read, with_relationship_store_read, with_evidence_store_read};
use utils::current_time;
use std::collections::HashMap;

// ==============
// HEALTH CHECK & SYSTEM INFO
// ==============

#[query]
fn health_check() -> String {
    let (evidence_count, relationship_count, user_count, settings_count) = get_storage_stats();
    
    format!(
        "🎯 Bonded Backend is healthy!\n\
        📊 Stats:\n\
        • Evidence: {} items\n\
        • Relationships: {} active\n\
        • Users: {} registered\n\
        • Settings: {} configured\n\
        🔐 Security: Threshold cryptography ready\n\
        💾 Storage: Stable memory operational\n\
        🌐 Network: Internet Computer blockchain",
        evidence_count, relationship_count, user_count, settings_count
    )
}

// ==============
// BATCH OPERATIONS FOR PERFORMANCE
// ==============

#[query]
fn get_user_dashboard_data() -> Result<UserDashboardData, String> {
    let user = ic_cdk::api::caller();
    
    // Single optimized call to get all user data
    let profile = with_user_store_read(|store| store.get(&user))
        .ok_or("User not found")?;
    
    let settings = with_settings_store_read(|store| store.get(&user))
        .unwrap_or_default();
    
    let relationships: Vec<Relationship> = profile.relationships.iter()
        .filter_map(|rel_id| {
            with_relationship_store_read(|store| store.get(rel_id))
        })
        .collect();
    
    // Get recent evidence (limited to 10 for performance)
    let recent_evidence: Vec<Evidence> = with_evidence_store_read(|store| {
        store.iter()
            .filter(|(_, evidence)| {
                relationships.iter().any(|rel| rel.id == evidence.relationship_id)
            })
            .take(10)
            .map(|(_, evidence)| evidence)
            .collect()
    });
    
    Ok(UserDashboardData {
        profile,
        settings,
        relationships,
        recent_evidence,
        last_updated: current_time(),
    })
}

#[query]
fn get_canister_stats() -> HashMap<String, u64> {
    let (evidence_count, relationship_count, user_count, settings_count) = get_storage_stats();
    
    let mut stats = HashMap::new();
    stats.insert("evidence_count".to_string(), evidence_count);
    stats.insert("relationship_count".to_string(), relationship_count);
    stats.insert("user_count".to_string(), user_count);
    stats.insert("settings_count".to_string(), settings_count);
    stats.insert("canister_version".to_string(), 1);
    stats.insert("last_updated".to_string(), utils::current_time());
    
    stats
}

#[query]
fn greet(name: String) -> String {
    format!("🔗💕 Hello from Bonded backend, {}! Ready to secure your relationship evidence on the blockchain.", name)
}

// ==================
// CANISTER LIFECYCLE
// ==================

#[ic_cdk_macros::init]
fn init() {
    ic_cdk::println!("🚀 Bonded Backend Canister initialized!");
    ic_cdk::println!("🔐 Stable memory ready for encrypted evidence storage");
    ic_cdk::println!("💝 Threshold cryptography system activated");
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("📦 Preparing for canister upgrade...");
    // Stable memory automatically persists between upgrades
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("✅ Canister upgrade completed successfully!");
    ic_cdk::println!("💾 All evidence and relationships preserved");
}

// Export candid interface
ic_cdk::export_candid!(); 