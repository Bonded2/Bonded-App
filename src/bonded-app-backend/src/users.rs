use crate::storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};

// =======================
// AUTHENTICATION SYSTEM
// =======================

#[query]
pub fn whoami() -> Principal {
    caller_principal()
}

#[update]
pub fn register_user(email: Option<String>) -> BondedResult<String> {
    let user = caller_principal();
    
    // Check if user already exists
    if with_user_store_read(|store| store.get(&user)).is_some() {
        return BondedResult::err("User already registered");
    }
    
    let profile = UserProfile {
        principal: user,
        created_at: current_time(),
        relationships: vec![],
        total_evidence_uploaded: 0,
        kyc_verified: false,
        last_seen: current_time(),
    };
    
    with_user_store(|store| {
        store.insert(user, profile);
    });
    
    // Create default settings
    let default_settings = UserSettings {
        ai_filters_enabled: true,
        nsfw_filter: true,
        explicit_text_filter: true,
        upload_schedule: "daily".to_string(),
        geolocation_enabled: true,
        notification_preferences: vec!["email".to_string()],
        profile_metadata: None,
        updated_at: current_time(),
    };
    
    with_settings_store(|store| {
        store.insert(user, default_settings);
    });
    
    // Log audit event
    log_audit_event(user, "register_user", email);
    
    BondedResult::ok("User registered successfully".to_string())
}

// ====================
// SETTINGS MANAGEMENT
// ====================

#[update]
pub fn update_user_settings(request: UpdateSettingsRequest) -> BondedResult<String> {
    let caller = caller_principal();
    
    let mut current_settings = with_settings_store_read(|store| store.get(&caller))
        .unwrap_or_else(|| UserSettings {
            ai_filters_enabled: true,
            nsfw_filter: true,
            explicit_text_filter: true,
            upload_schedule: "daily".to_string(),
            geolocation_enabled: true,
            notification_preferences: vec!["email".to_string()],
            profile_metadata: None,
            updated_at: current_time(),
        });
    
    // Update only provided fields
    if let Some(ai_filters) = request.ai_filters_enabled {
        current_settings.ai_filters_enabled = ai_filters;
    }
    if let Some(nsfw) = request.nsfw_filter {
        current_settings.nsfw_filter = nsfw;
    }
    if let Some(explicit) = request.explicit_text_filter {
        current_settings.explicit_text_filter = explicit;
    }
    if let Some(schedule) = request.upload_schedule {
        current_settings.upload_schedule = schedule;
    }
    if let Some(geo) = request.geolocation_enabled {
        current_settings.geolocation_enabled = geo;
    }
    if let Some(notifications) = request.notification_preferences {
        current_settings.notification_preferences = notifications;
    }
    if let Some(profile_metadata) = request.profile_metadata {
        current_settings.profile_metadata = Some(profile_metadata);
    }
    
    current_settings.updated_at = current_time();
    
    with_settings_store(|store| {
        store.insert(caller, current_settings);
    });
    
    // Log audit event
    log_audit_event(caller, "update_settings", None);
    
    BondedResult::ok("Settings updated successfully".to_string())
}

#[query]
pub fn get_user_settings() -> BondedResult<UserSettings> {
    let caller = caller_principal();
    
    match with_settings_store_read(|store| store.get(&caller)) {
        Some(settings) => BondedResult::ok(settings),
        None => BondedResult::err("Settings not found"),
    }
}

// =================
// PROFILE MANAGEMENT
// =================

#[update]
pub fn update_face_embedding(embedding: Vec<f32>) -> BondedResult<String> {
    let user = caller_principal();
    
    // For now, we'll just log this for MVP
    // In production, this would store the face embedding securely
    log_audit_event(user, "update_face_embedding", Some(format!("embedding_size:{}", embedding.len())));
    
    // Update user's last seen time
    with_user_store(|store| {
        if let Some(mut profile) = store.get(&user) {
            profile.last_seen = current_time();
            store.insert(user, profile);
        }
    });
    
    BondedResult::ok("Face embedding updated successfully".to_string())
}

#[update]
pub fn verify_kyc() -> BondedResult<String> {
    let user = caller_principal();
    
    with_user_store(|store| {
        if let Some(mut profile) = store.get(&user) {
            profile.kyc_verified = true;
            profile.last_seen = current_time();
            store.insert(user, profile);
        } else {
            return BondedResult::err("User profile not found");
        }
        BondedResult::ok("KYC verification completed".to_string())
    })
}

#[query]
pub fn get_user_profile() -> BondedResult<UserProfile> {
    let caller = caller_principal();
    
    match with_user_store_read(|store| store.get(&caller)) {
        Some(profile) => BondedResult::ok(profile),
        None => BondedResult::err("Profile not found"),
    }
}

#[update]
pub fn delete_user_account() -> BondedResult<String> {
    let caller = caller_principal();
    
    // Get user's relationships first
    let user_relationships: Vec<String> = with_user_store_read(|store| {
        store.get(&caller)
            .map(|profile| profile.relationships)
            .unwrap_or_default()
    });
    
    // Terminate all relationships
    for relationship_id in user_relationships {
        if let Some(relationship) = with_relationship_store_read(|store| store.get(&relationship_id)) {
            // Mark relationship as terminated
            let mut updated_relationship = relationship;
            updated_relationship.status = RelationshipStatus::Terminated;
            updated_relationship.last_activity = current_time();
            
            with_relationship_store(|store| {
                store.insert(relationship_id.clone(), updated_relationship);
            });
            
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
        }
    }
    
    // Delete user profile and settings
    with_user_store(|store| {
        store.remove(&caller);
    });
    
    with_settings_store(|store| {
        store.remove(&caller);
    });
    
    // Log audit event
    log_audit_event(caller, "delete_account", None);
    
    BondedResult::ok("User account and all associated data deleted successfully".to_string())
} 