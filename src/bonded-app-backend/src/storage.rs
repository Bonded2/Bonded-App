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

// Memory layout
const EVIDENCE_MEMORY_ID: MemoryId = MemoryId::new(0);
const RELATIONSHIP_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_MEMORY_ID: MemoryId = MemoryId::new(2);
const SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(3);

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
    
    static CANISTER_STATE: RefCell<CanisterState> = RefCell::new(CanisterState::default());
}

// Internal state
#[derive(Default)]
pub struct CanisterState {
    pub next_evidence_id: u64,
    pub next_relationship_id: u64,
    pub total_evidence_count: u64,
    pub total_relationship_count: u64,
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

pub fn with_canister_state<R>(f: impl FnOnce(&mut CanisterState) -> R) -> R {
    CANISTER_STATE.with(|state| f(&mut state.borrow_mut()))
}

pub fn with_canister_state_read<R>(f: impl FnOnce(&CanisterState) -> R) -> R {
    CANISTER_STATE.with(|state| f(&state.borrow()))
}

// Statistics functions
pub fn get_storage_stats() -> (u64, u64, u64, u64) {
    let evidence_count = with_evidence_store_read(|store| store.len());
    let relationship_count = with_relationship_store_read(|store| store.len());
    let user_count = with_user_store_read(|store| store.len());
    let settings_count = with_settings_store_read(|store| store.len());
    
    (evidence_count, relationship_count, user_count, settings_count)
} 