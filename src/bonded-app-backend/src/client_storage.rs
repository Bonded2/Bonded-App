use crate::storage::*;
use crate::types::*;
use crate::utils::*;
use candid::Principal;
use ic_cdk_macros::{query, update};

// =======================
// TIMELINE DATA STORAGE
// =======================

#[update]
pub fn save_timeline_data(timeline_items: Vec<String>) -> BondedResult<String> {
    let caller = caller_principal();
    let timeline_id = format!("timeline_{}", caller.to_text());
    
    let timeline_data = TimelineData {
        id: timeline_id.clone(),
        user: caller,
        timeline_items,
        updated_at: current_time(),
    };
    
    with_timeline_store(|store| {
        store.insert(timeline_id.clone(), timeline_data);
    });
    
    // Log audit event
    log_audit_event(caller, "save_timeline_data", None);
    
    BondedResult::ok("Timeline data saved successfully".to_string())
}

#[query]
pub fn get_timeline_data() -> BondedResult<Vec<String>> {
    let caller = caller_principal();
    let timeline_id = format!("timeline_{}", caller.to_text());
    
    match with_timeline_store_read(|store| store.get(&timeline_id)) {
        Some(timeline_data) => BondedResult::ok(timeline_data.timeline_items),
        None => BondedResult::ok(vec![]), // Return empty if not found
    }
}

// =======================
// FACE EMBEDDING STORAGE
// =======================

#[update]
pub fn save_face_embedding(embedding_data: Vec<f32>, partner_id: Option<Principal>) -> BondedResult<String> {
    let caller = caller_principal();
    
    let face_embedding = UserFaceEmbedding {
        user: caller,
        embedding_data,
        partner_id,
        created_at: current_time(),
        updated_at: current_time(),
    };
    
    with_face_embedding_store(|store| {
        store.insert(caller, face_embedding);
    });
    
    // Log audit event
    log_audit_event(caller, "save_face_embedding", None);
    
    BondedResult::ok("Face embedding saved successfully".to_string())
}

#[query]
pub fn get_face_embedding() -> BondedResult<UserFaceEmbedding> {
    let caller = caller_principal();
    
    match with_face_embedding_store_read(|store| store.get(&caller)) {
        Some(embedding) => BondedResult::ok(embedding),
        None => BondedResult::err("Face embedding not found"),
    }
}

#[query]
pub fn get_all_face_embeddings() -> BondedResult<Vec<UserFaceEmbedding>> {
    let caller = caller_principal();
    
    let embeddings: Vec<UserFaceEmbedding> = with_face_embedding_store_read(|store| {
        store
            .iter()
            .filter_map(|(user, embedding)| {
                // Only return caller's own embeddings or embeddings they're associated with
                if user == caller || embedding.partner_id == Some(caller) {
                    Some(embedding)
                } else {
                    None
                }
            })
            .collect()
    });
    
    BondedResult::ok(embeddings)
}

#[update]
pub fn delete_face_embeddings() -> BondedResult<String> {
    let caller = caller_principal();
    
    with_face_embedding_store(|store| {
        store.remove(&caller);
    });
    
    // Log audit event
    log_audit_event(caller, "delete_face_embeddings", None);
    
    BondedResult::ok("Face embeddings deleted successfully".to_string())
}

// =======================
// AUTO SCANNER SETTINGS
// =======================

#[update]
pub fn save_auto_scanner_settings(settings_data: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    let scanner_settings = AutoScannerSettings {
        user: caller,
        settings_data,
        updated_at: current_time(),
    };
    
    with_auto_scanner_store(|store| {
        store.insert(caller, scanner_settings);
    });
    
    // Log audit event
    log_audit_event(caller, "save_auto_scanner_settings", None);
    
    BondedResult::ok("Auto scanner settings saved successfully".to_string())
}

#[query]
pub fn get_auto_scanner_settings() -> BondedResult<String> {
    let caller = caller_principal();
    
    match with_auto_scanner_store_read(|store| store.get(&caller)) {
        Some(settings) => BondedResult::ok(settings.settings_data),
        None => BondedResult::ok("{}".to_string()), // Return empty JSON if not found
    }
}

// =======================
// CAPTURE SETTINGS
// =======================

#[update]
pub fn save_capture_settings(settings_data: String, file_type_overrides: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    let capture_settings = CaptureSettings {
        user: caller,
        settings_data,
        file_type_overrides,
        updated_at: current_time(),
    };
    
    with_capture_settings_store(|store| {
        store.insert(caller, capture_settings);
    });
    
    // Log audit event
    log_audit_event(caller, "save_capture_settings", None);
    
    BondedResult::ok("Capture settings saved successfully".to_string())
}

#[query]
pub fn get_capture_settings() -> BondedResult<(String, String)> {
    let caller = caller_principal();
    
    match with_capture_settings_store_read(|store| store.get(&caller)) {
        Some(settings) => BondedResult::ok((settings.settings_data, settings.file_type_overrides)),
        None => BondedResult::ok(("{}".to_string(), "{}".to_string())), // Return empty JSON if not found
    }
}

// =======================
// EMAIL LOG STORAGE
// =======================

#[update]
pub fn save_email_log(log_data: String) -> BondedResult<String> {
    let caller = caller_principal();
    let log_id = format!("email_log_{}_{}", caller.to_text(), current_time());
    
    let email_log = EmailLog {
        id: log_id.clone(),
        user: caller,
        log_data,
        created_at: current_time(),
    };
    
    with_email_log_store(|store| {
        store.insert(log_id.clone(), email_log);
    });
    
    // Log audit event
    log_audit_event(caller, "save_email_log", None);
    
    BondedResult::ok(log_id)
}

#[query]
pub fn get_email_logs() -> BondedResult<Vec<EmailLog>> {
    let caller = caller_principal();
    
    let logs: Vec<EmailLog> = with_email_log_store_read(|store| {
        store
            .iter()
            .filter_map(|(_, log)| {
                if log.user == caller {
                    Some(log)
                } else {
                    None
                }
            })
            .collect()
    });
    
    BondedResult::ok(logs)
}

// =======================
// GEOLOCATION CACHE
// =======================

#[update]
pub fn save_geo_cache(cache_key: String, cache_data: String, expires_at: u64) -> BondedResult<String> {
    let caller = caller_principal();
    
    let geo_cache = GeolocationCache {
        cache_key: cache_key.clone(),
        user: Some(caller),
        cache_data,
        expires_at,
        created_at: current_time(),
    };
    
    with_geo_cache_store(|store| {
        store.insert(cache_key.clone(), geo_cache);
    });
    
    BondedResult::ok("Geo cache saved successfully".to_string())
}

#[query]
pub fn get_geo_cache(cache_key: String) -> BondedResult<String> {
    match with_geo_cache_store_read(|store| store.get(&cache_key)) {
        Some(cache) => {
            // Check if cache has expired
            if cache.expires_at > current_time() {
                BondedResult::ok(cache.cache_data)
            } else {
                BondedResult::err("Cache expired")
            }
        },
        None => BondedResult::err("Cache not found"),
    }
}

#[update]
pub fn cleanup_expired_geo_cache() -> BondedResult<String> {
    let current_time = current_time();
    let mut removed_count = 0;
    
    let expired_keys: Vec<String> = with_geo_cache_store_read(|store| {
        store
            .iter()
            .filter_map(|(key, cache)| {
                if cache.expires_at <= current_time {
                    Some(key)
                } else {
                    None
                }
            })
            .collect()
    });
    
    with_geo_cache_store(|store| {
        for key in expired_keys {
            store.remove(&key);
            removed_count += 1;
        }
    });
    
    BondedResult::ok(format!("Removed {} expired cache entries", removed_count))
}

// =======================
// SCHEDULER SETTINGS
// =======================

#[update]
pub fn save_scheduler_settings(settings_data: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    let scheduler_settings = SchedulerSettings {
        user: caller,
        settings_data,
        updated_at: current_time(),
    };
    
    with_scheduler_store(|store| {
        store.insert(caller, scheduler_settings);
    });
    
    // Log audit event
    log_audit_event(caller, "save_scheduler_settings", None);
    
    BondedResult::ok("Scheduler settings saved successfully".to_string())
}

#[query]
pub fn get_scheduler_settings() -> BondedResult<String> {
    let caller = caller_principal();
    
    match with_scheduler_store_read(|store| store.get(&caller)) {
        Some(settings) => BondedResult::ok(settings.settings_data),
        None => BondedResult::ok("{}".to_string()), // Return empty JSON if not found
    }
}

// =======================
// PROCESSED CONTENT STORAGE
// =======================

#[update]
pub fn save_processed_content(
    content_id: String,
    relationship_id: Option<String>,
    content_data: String,
    content_type: String,
) -> BondedResult<String> {
    let caller = caller_principal();
    
    let processed_content = ProcessedContent {
        id: content_id.clone(),
        user: caller,
        relationship_id,
        content_data,
        content_type: content_type.clone(),
        created_at: current_time(),
        updated_at: current_time(),
    };
    
    with_content_store(|store| {
        store.insert(content_id.clone(), processed_content);
    });
    
    // Log audit event
    log_audit_event(caller, "save_processed_content", Some(content_type));
    
    BondedResult::ok("Processed content saved successfully".to_string())
}

#[query]
pub fn get_processed_content(content_id: String) -> BondedResult<ProcessedContent> {
    let caller = caller_principal();
    
    match with_content_store_read(|store| store.get(&content_id)) {
        Some(content) => {
            if content.user == caller {
                BondedResult::ok(content)
            } else {
                BondedResult::err("Access denied")
            }
        },
        None => BondedResult::err("Content not found"),
    }
}

#[query]
pub fn get_processed_content_by_type(content_type: String) -> BondedResult<Vec<ProcessedContent>> {
    let caller = caller_principal();
    
    let content: Vec<ProcessedContent> = with_content_store_read(|store| {
        store
            .iter()
            .filter_map(|(_, content)| {
                if content.user == caller && content.content_type == content_type {
                    Some(content)
                } else {
                    None
                }
            })
            .collect()
    });
    
    BondedResult::ok(content)
}

#[update]
pub fn delete_processed_content(content_id: String) -> BondedResult<String> {
    let caller = caller_principal();
    
    // Verify ownership before deletion
    let can_delete = with_content_store_read(|store| {
        store.get(&content_id)
            .map(|content| content.user == caller)
            .unwrap_or(false)
    });
    
    if !can_delete {
        return BondedResult::err("Access denied or content not found");
    }
    
    with_content_store(|store| {
        store.remove(&content_id);
    });
    
    // Log audit event
    log_audit_event(caller, "delete_processed_content", Some(content_id));
    
    BondedResult::ok("Processed content deleted successfully".to_string())
}

// =======================
// USER SETTINGS & DATA
// =======================

#[update]
pub fn save_user_data(data_type: String, data_content: String) -> BondedResult<String> {
    let caller = caller_principal();
    let content_id = format!("{}_{}", data_type, caller.to_text());
    
    let processed_content = ProcessedContent {
        id: content_id.clone(),
        user: caller,
        relationship_id: None,
        content_data: data_content,
        content_type: data_type,
        created_at: current_time(),
        updated_at: current_time(),
    };
    
    with_content_store(|store| {
        store.insert(content_id.clone(), processed_content);
    });
    
    BondedResult::ok("User data saved successfully".to_string())
}

#[query]
pub fn get_user_data(data_type: String) -> BondedResult<String> {
    let caller = caller_principal();
    let content_id = format!("{}_{}", data_type, caller.to_text());
    
    match with_content_store_read(|store| store.get(&content_id)) {
        Some(content) => BondedResult::ok(content.content_data),
        None => BondedResult::ok("{}".to_string()), // Return empty JSON if not found
    }
}

// =======================
// CLIENT DATA STORAGE (Frontend compatibility)
// =======================

#[update]
pub fn store_client_data(data_key: String, data_value: String) -> BondedResult<String> {
    let caller = caller_principal();
    let content_id = format!("client_{}_{}", data_key, caller.to_text());
    
    let processed_content = ProcessedContent {
        id: content_id.clone(),
        user: caller,
        relationship_id: None,
        content_data: data_value,
        content_type: "client_data".to_string(),
        created_at: current_time(),
        updated_at: current_time(),
    };
    
    with_content_store(|store| {
        store.insert(content_id.clone(), processed_content);
    });
    
    // Log audit event
    log_audit_event(caller, "store_client_data", Some(data_key));
    
    BondedResult::ok("Client data stored successfully".to_string())
}

#[query]
pub fn get_client_data(data_key: String) -> BondedResult<String> {
    let caller = caller_principal();
    let content_id = format!("client_{}_{}", data_key, caller.to_text());
    
    match with_content_store_read(|store| store.get(&content_id)) {
        Some(content) => BondedResult::ok(content.content_data),
        None => BondedResult::ok("{}".to_string()), // Return empty JSON if not found
    }
}

// =======================
// BULK OPERATIONS
// =======================

#[update]
pub fn clear_all_user_data() -> BondedResult<String> {
    let caller = caller_principal();
    
    // Clear timeline data
    let timeline_id = format!("timeline_{}", caller.to_text());
    with_timeline_store(|store| {
        store.remove(&timeline_id);
    });
    
    // Remove all processed content
    let content_keys: Vec<String> = with_content_store_read(|store| {
        store
            .iter()
            .filter_map(|(key, content)| {
                if content.user == caller {
                    Some(key)
                } else {
                    None
                }
            })
            .collect()
    });
    
    with_content_store(|store| {
        for key in content_keys {
            store.remove(&key);
        }
    });
    
    // Log audit event
    log_audit_event(caller, "clear_all_user_data", None);
    
    BondedResult::ok("All user data cleared successfully".to_string())
} 