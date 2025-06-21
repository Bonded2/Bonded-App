use crate::types::*;
use candid::Principal;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

// Type aliases for stable structures
pub type Memory = VirtualMemory<DefaultMemoryImpl>;
pub type EvidenceStorage = StableBTreeMap<String, Evidence, Memory>;
pub type RelationshipStorage = StableBTreeMap<String, Relationship, Memory>;
pub type UserStorage = StableBTreeMap<Principal, UserProfile, Memory>;
pub type SettingsStorage = StableBTreeMap<Principal, UserSettings, Memory>;
pub type InviteStorage = StableBTreeMap<String, PartnerInvite, Memory>;
pub type TimelineStorage = StableBTreeMap<String, TimelineData, Memory>;
pub type FaceEmbeddingStorage = StableBTreeMap<Principal, UserFaceEmbedding, Memory>;
pub type AutoScannerStorage = StableBTreeMap<Principal, AutoScannerSettings, Memory>;
pub type CaptureSettingsStorage = StableBTreeMap<Principal, CaptureSettings, Memory>;
pub type EmailLogStorage = StableBTreeMap<String, EmailLog, Memory>;
pub type GeoCacheStorage = StableBTreeMap<String, GeolocationCache, Memory>;
pub type SchedulerStorage = StableBTreeMap<Principal, SchedulerSettings, Memory>;
pub type ContentStorage = StableBTreeMap<String, ProcessedContent, Memory>;
pub type KeyShareStorage = StableBTreeMap<String, UserKeyShare, Memory>;

// Memory layout
const EVIDENCE_MEMORY_ID: MemoryId = MemoryId::new(0);
const RELATIONSHIP_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_MEMORY_ID: MemoryId = MemoryId::new(2);
const SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(3);
const INVITE_MEMORY_ID: MemoryId = MemoryId::new(4);
const TIMELINE_MEMORY_ID: MemoryId = MemoryId::new(5);
const FACE_EMBEDDING_MEMORY_ID: MemoryId = MemoryId::new(6);
const AUTO_SCANNER_MEMORY_ID: MemoryId = MemoryId::new(7);
const CAPTURE_SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(8);
const EMAIL_LOG_MEMORY_ID: MemoryId = MemoryId::new(9);
const GEO_CACHE_MEMORY_ID: MemoryId = MemoryId::new(10);
const SCHEDULER_MEMORY_ID: MemoryId = MemoryId::new(11);
const CONTENT_MEMORY_ID: MemoryId = MemoryId::new(12);
const KEY_SHARE_MEMORY_ID: MemoryId = MemoryId::new(13);

// Global state management
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    static EVIDENCE_STORE: RefCell<EvidenceStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(EVIDENCE_MEMORY_ID)),
        )
    );
    
    static RELATIONSHIP_STORE: RefCell<RelationshipStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(RELATIONSHIP_MEMORY_ID)),
        )
    );
    
    static USER_STORE: RefCell<UserStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(USER_MEMORY_ID)),
        )
    );
    
    static SETTINGS_STORE: RefCell<SettingsStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(SETTINGS_MEMORY_ID)),
        )
    );
    
    static INVITE_STORE: RefCell<InviteStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(INVITE_MEMORY_ID)),
        )
    );
    
    static TIMELINE_STORE: RefCell<TimelineStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TIMELINE_MEMORY_ID)),
        )
    );
    
    static FACE_EMBEDDING_STORE: RefCell<FaceEmbeddingStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(FACE_EMBEDDING_MEMORY_ID)),
        )
    );
    
    static AUTO_SCANNER_STORE: RefCell<AutoScannerStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(AUTO_SCANNER_MEMORY_ID)),
        )
    );
    
    static CAPTURE_SETTINGS_STORE: RefCell<CaptureSettingsStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CAPTURE_SETTINGS_MEMORY_ID)),
        )
    );
    
    static EMAIL_LOG_STORE: RefCell<EmailLogStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(EMAIL_LOG_MEMORY_ID)),
        )
    );
    
    static GEO_CACHE_STORE: RefCell<GeoCacheStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(GEO_CACHE_MEMORY_ID)),
        )
    );
    
    static SCHEDULER_STORE: RefCell<SchedulerStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(SCHEDULER_MEMORY_ID)),
        )
    );
    
    static CONTENT_STORE: RefCell<ContentStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONTENT_MEMORY_ID)),
        )
    );
    
    static KEY_SHARE_STORE: RefCell<KeyShareStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(KEY_SHARE_MEMORY_ID)),
        )
    );
    
    static CANISTER_STATE: RefCell<CanisterState> = RefCell::new(CanisterState::default());
}

// Internal state
#[derive(Default)]
pub struct CanisterState {
    pub next_evidence_id: u64,
    pub next_relationship_id: u64,
    pub next_invite_id: u64,
    pub total_evidence_count: u64,
    pub total_relationship_count: u64,
    pub total_invite_count: u64,
}

// Storage access functions
pub fn with_evidence_store<R>(f: impl FnOnce(&mut EvidenceStorage) -> R) -> R {
    EVIDENCE_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_evidence_store_read<R>(f: impl FnOnce(&EvidenceStorage) -> R) -> R {
    EVIDENCE_STORE.with(|store| f(&store.borrow()))
}

pub fn with_relationship_store<R>(f: impl FnOnce(&mut RelationshipStorage) -> R) -> R {
    RELATIONSHIP_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_relationship_store_read<R>(f: impl FnOnce(&RelationshipStorage) -> R) -> R {
    RELATIONSHIP_STORE.with(|store| f(&store.borrow()))
}

pub fn with_user_store<R>(f: impl FnOnce(&mut UserStorage) -> R) -> R {
    USER_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_user_store_read<R>(f: impl FnOnce(&UserStorage) -> R) -> R {
    USER_STORE.with(|store| f(&store.borrow()))
}

pub fn with_settings_store<R>(f: impl FnOnce(&mut SettingsStorage) -> R) -> R {
    SETTINGS_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_settings_store_read<R>(f: impl FnOnce(&SettingsStorage) -> R) -> R {
    SETTINGS_STORE.with(|store| f(&store.borrow()))
}

pub fn with_invite_store<R>(f: impl FnOnce(&mut InviteStorage) -> R) -> R {
    INVITE_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_invite_store_read<R>(f: impl FnOnce(&InviteStorage) -> R) -> R {
    INVITE_STORE.with(|store| f(&store.borrow()))
}

pub fn with_canister_state<R>(f: impl FnOnce(&mut CanisterState) -> R) -> R {
    CANISTER_STATE.with(|state| f(&mut state.borrow_mut()))
}

pub fn with_canister_state_read<R>(f: impl FnOnce(&CanisterState) -> R) -> R {
    CANISTER_STATE.with(|state| f(&state.borrow()))
}

// Timeline storage accessors
pub fn with_timeline_store<R>(f: impl FnOnce(&mut TimelineStorage) -> R) -> R {
    TIMELINE_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_timeline_store_read<R>(f: impl FnOnce(&TimelineStorage) -> R) -> R {
    TIMELINE_STORE.with(|store| f(&store.borrow()))
}

// Face embedding storage accessors
pub fn with_face_embedding_store<R>(f: impl FnOnce(&mut FaceEmbeddingStorage) -> R) -> R {
    FACE_EMBEDDING_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_face_embedding_store_read<R>(f: impl FnOnce(&FaceEmbeddingStorage) -> R) -> R {
    FACE_EMBEDDING_STORE.with(|store| f(&store.borrow()))
}

// Auto scanner storage accessors
pub fn with_auto_scanner_store<R>(f: impl FnOnce(&mut AutoScannerStorage) -> R) -> R {
    AUTO_SCANNER_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_auto_scanner_store_read<R>(f: impl FnOnce(&AutoScannerStorage) -> R) -> R {
    AUTO_SCANNER_STORE.with(|store| f(&store.borrow()))
}

// Capture settings storage accessors
pub fn with_capture_settings_store<R>(f: impl FnOnce(&mut CaptureSettingsStorage) -> R) -> R {
    CAPTURE_SETTINGS_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_capture_settings_store_read<R>(f: impl FnOnce(&CaptureSettingsStorage) -> R) -> R {
    CAPTURE_SETTINGS_STORE.with(|store| f(&store.borrow()))
}

// Email log storage accessors
pub fn with_email_log_store<R>(f: impl FnOnce(&mut EmailLogStorage) -> R) -> R {
    EMAIL_LOG_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_email_log_store_read<R>(f: impl FnOnce(&EmailLogStorage) -> R) -> R {
    EMAIL_LOG_STORE.with(|store| f(&store.borrow()))
}

// Geo cache storage accessors
pub fn with_geo_cache_store<R>(f: impl FnOnce(&mut GeoCacheStorage) -> R) -> R {
    GEO_CACHE_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_geo_cache_store_read<R>(f: impl FnOnce(&GeoCacheStorage) -> R) -> R {
    GEO_CACHE_STORE.with(|store| f(&store.borrow()))
}

// Scheduler storage accessors
pub fn with_scheduler_store<R>(f: impl FnOnce(&mut SchedulerStorage) -> R) -> R {
    SCHEDULER_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_scheduler_store_read<R>(f: impl FnOnce(&SchedulerStorage) -> R) -> R {
    SCHEDULER_STORE.with(|store| f(&store.borrow()))
}

// Content storage accessors
pub fn with_content_store<R>(f: impl FnOnce(&mut ContentStorage) -> R) -> R {
    CONTENT_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_content_store_read<R>(f: impl FnOnce(&ContentStorage) -> R) -> R {
    CONTENT_STORE.with(|store| f(&store.borrow()))
}

// Key share storage accessors
pub fn with_key_share_store<R>(f: impl FnOnce(&mut KeyShareStorage) -> R) -> R {
    KEY_SHARE_STORE.with(|store| f(&mut store.borrow_mut()))
}

pub fn with_key_share_store_read<R>(f: impl FnOnce(&KeyShareStorage) -> R) -> R {
    KEY_SHARE_STORE.with(|store| f(&store.borrow()))
}

// Statistics functions
pub fn get_storage_stats() -> (u64, u64, u64, u64) {
    let evidence_count = with_evidence_store_read(|store| store.len());
    let relationship_count = with_relationship_store_read(|store| store.len());
    let user_count = with_user_store_read(|store| store.len());
    let settings_count = with_settings_store_read(|store| store.len());
    
    (evidence_count, relationship_count, user_count, settings_count)
} 