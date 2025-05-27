use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::management_canister::main::raw_rand;
use ic_cdk::{caller, id, trap};
use ic_cdk_macros::*;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{BoundedStorable, DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashMap;
use time::OffsetDateTime;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Storage for users, auth sessions, and relationships
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USERS: RefCell<StableBTreeMap<Principal, User, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    static AUTH_SESSIONS: RefCell<StableBTreeMap<String, AuthSession, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        )
    );

    static RELATIONSHIPS: RefCell<StableBTreeMap<String, Relationship, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
        )
    );

    static THRESHOLD_KEYS: RefCell<StableBTreeMap<Principal, ThresholdKeyData, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        )
    );

    static EVIDENCE_VAULT: RefCell<StableBTreeMap<String, EvidenceEntry, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))),
        )
    );
}

// Core data structures
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct User {
    pub user_principal: Principal,
    pub username: Option<String>,
    pub email: Option<String>,
    pub profile_photo: Option<String>,
    pub kyc_status: KycStatus,
    pub created_at: u64,
    pub updated_at: u64,
    pub settings: UserSettings,
    pub verification_methods: Vec<VerificationMethod>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserSettings {
    pub image_filter_enabled: bool,
    pub text_filter_enabled: bool,
    pub location_filter_enabled: bool,
    pub upload_cycle: UploadCycle,
    pub privacy_level: PrivacyLevel,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum UploadCycle {
    Daily,
    Weekly,
    Manual,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum PrivacyLevel {
    Private,
    Relationship,
    Public,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum KycStatus {
    Unverified,
    Pending,
    Verified,
    Rejected,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum VerificationMethod {
    InternetIdentity,
    Yoti { verification_id: String },
    ThresholdKey { key_id: String },
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AuthSession {
    pub session_id: String,
    pub user_principal: Principal,
    pub created_at: u64,
    pub expires_at: u64,
    pub is_active: bool,
    pub verification_method: VerificationMethod,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ThresholdKeyData {
    pub user_principal: Principal,
    pub key_shares: Vec<KeyShare>,
    pub threshold: u8,
    pub total_shares: u8,
    pub created_at: u64,
    pub is_active: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct KeyShare {
    pub share_id: String,
    pub encrypted_share: String,
    pub share_holder: Principal,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Relationship {
    pub id: String,
    pub user_a: Principal,
    pub user_b: Principal,
    pub relationship_type: RelationshipType,
    pub status: RelationshipStatus,
    pub created_at: u64,
    pub updated_at: u64,
    pub metadata: HashMap<String, String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum RelationshipType {
    Partner,
    Family,
    Friend,
    Professional,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum RelationshipStatus {
    Pending,
    Active,
    Blocked,
    Terminated,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EvidenceEntry {
    pub id: String,
    pub owner: Principal,
    pub file_hash: String,
    pub encrypted_data: String,
    pub metadata: EvidenceMetadata,
    pub created_at: u64,
    pub upload_cycle_id: String,
    pub is_revoked: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EvidenceMetadata {
    pub file_type: String,
    pub file_size: u64,
    pub timestamp: u64,
    pub location: Option<Location>,
    pub content_filters_applied: Vec<String>,
    pub source: EvidenceSource,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Location {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: Option<f64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum EvidenceSource {
    Manual,
    Telegram,
    PhotoLibrary,
    Document,
}

// Request/Response types
#[derive(CandidType, Deserialize)]
pub struct CreateUserRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub verification_method: VerificationMethod,
}

#[derive(CandidType, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub profile_photo: Option<String>,
    pub settings: Option<UserSettings>,
}

#[derive(CandidType, Deserialize)]
pub struct CreateRelationshipRequest {
    pub target_user: Principal,
    pub relationship_type: RelationshipType,
    pub metadata: HashMap<String, String>,
}

#[derive(CandidType, Deserialize)]
pub struct UploadEvidenceRequest {
    pub encrypted_data: String,
    pub file_hash: String,
    pub metadata: EvidenceMetadata,
    pub upload_cycle_id: String,
}

#[derive(CandidType, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

// Implement Storable for stable storage
impl Storable for User {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for User {
    const MAX_SIZE: u32 = 2048;
    const IS_FIXED_SIZE: bool = false;
}

impl Storable for AuthSession {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for AuthSession {
    const MAX_SIZE: u32 = 1024;
    const IS_FIXED_SIZE: bool = false;
}

impl Storable for Relationship {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for Relationship {
    const MAX_SIZE: u32 = 1536;
    const IS_FIXED_SIZE: bool = false;
}

impl Storable for ThresholdKeyData {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for ThresholdKeyData {
    const MAX_SIZE: u32 = 4096;
    const IS_FIXED_SIZE: bool = false;
}

impl Storable for EvidenceEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for EvidenceEntry {
    const MAX_SIZE: u32 = 8192;
    const IS_FIXED_SIZE: bool = false;
}

// Utility functions
fn generate_id() -> String {
    let timestamp = ic_cdk::api::time();
    let caller_principal = caller();
    let mut hasher = Sha256::new();
    hasher.update(timestamp.to_be_bytes());
    hasher.update(caller_principal.as_slice());
    hex::encode(hasher.finalize())
}

fn current_timestamp() -> u64 {
    ic_cdk::api::time() / 1_000_000 // Convert nanoseconds to seconds
}

fn is_session_valid(session: &AuthSession) -> bool {
    session.is_active && session.expires_at > current_timestamp()
}

// Authentication and user management functions
#[update]
pub async fn create_user(request: CreateUserRequest) -> ApiResponse<User> {
    let principal = caller();
    
    // Check if user already exists
    if USERS.with(|users| users.borrow().contains_key(&principal)) {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("User already exists".to_string()),
        };
    }

    let now = current_timestamp();
    
    let user = User {
        user_principal: principal,
        username: request.username,
        email: request.email,
        profile_photo: None,
        kyc_status: KycStatus::Unverified,
        created_at: now,
        updated_at: now,
        settings: UserSettings {
            image_filter_enabled: true,
            text_filter_enabled: true,
            location_filter_enabled: false,
            upload_cycle: UploadCycle::Daily,
            privacy_level: PrivacyLevel::Private,
        },
        verification_methods: vec![request.verification_method],
    };

    USERS.with(|users| {
        users.borrow_mut().insert(principal, user.clone());
    });

    ApiResponse {
        success: true,
        data: Some(user),
        error: None,
    }
}

#[query]
pub fn get_user() -> ApiResponse<User> {
    let principal = caller();
    
    match USERS.with(|users| users.borrow().get(&principal)) {
        Some(user) => ApiResponse {
            success: true,
            data: Some(user),
            error: None,
        },
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("User not found".to_string()),
        },
    }
}

#[update]
pub fn update_user(request: UpdateUserRequest) -> ApiResponse<User> {
    let principal = caller();
    
    let updated_user = USERS.with(|users| {
        let mut users = users.borrow_mut();
        match users.get(&principal) {
            Some(mut user) => {
                if let Some(username) = request.username {
                    user.username = Some(username);
                }
                if let Some(email) = request.email {
                    user.email = Some(email);
                }
                if let Some(profile_photo) = request.profile_photo {
                    user.profile_photo = Some(profile_photo);
                }
                if let Some(settings) = request.settings {
                    user.settings = settings;
                }
                user.updated_at = current_timestamp();
                
                users.insert(principal, user.clone());
                Some(user)
            }
            None => None,
        }
    });

    match updated_user {
        Some(user) => ApiResponse {
            success: true,
            data: Some(user),
            error: None,
        },
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("User not found".to_string()),
        },
    }
}

#[update]
pub async fn create_auth_session() -> ApiResponse<AuthSession> {
    let principal = caller();
    
    // Verify user exists
    if !USERS.with(|users| users.borrow().contains_key(&principal)) {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("User not found".to_string()),
        };
    }

    let session_id = generate_id();
    let now = current_timestamp();
    let expires_at = now + 86400; // 24 hours

    let session = AuthSession {
        session_id: session_id.clone(),
        user_principal: principal,
        created_at: now,
        expires_at,
        is_active: true,
        verification_method: VerificationMethod::InternetIdentity,
    };

    AUTH_SESSIONS.with(|sessions| {
        sessions.borrow_mut().insert(session_id.clone(), session.clone());
    });

    ApiResponse {
        success: true,
        data: Some(session),
        error: None,
    }
}

#[update]
pub fn invalidate_session(session_id: String) -> ApiResponse<bool> {
    let principal = caller();
    
    let result = AUTH_SESSIONS.with(|sessions| {
        let mut sessions = sessions.borrow_mut();
        match sessions.get(&session_id) {
            Some(mut session) if session.user_principal == principal => {
                session.is_active = false;
                sessions.insert(session_id, session);
                true
            }
            _ => false,
        }
    });

    ApiResponse {
        success: result,
        data: Some(result),
        error: if result { None } else { Some("Session not found or unauthorized".to_string()) },
    }
}

// Threshold key management
#[update]
pub async fn setup_threshold_keys(threshold: u8, total_shares: u8) -> ApiResponse<ThresholdKeyData> {
    let principal = caller();
    
    if threshold == 0 || total_shares == 0 || threshold > total_shares {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("Invalid threshold parameters".to_string()),
        };
    }

    // Generate random key shares (simplified implementation)
    let mut key_shares = Vec::new();
    for i in 0..total_shares {
        let share_id = format!("{}_{}", generate_id(), i);
        let encrypted_share = generate_id(); // In real implementation, this would be properly encrypted
        
        let key_share = KeyShare {
            share_id,
            encrypted_share,
            share_holder: principal, // In real implementation, different principals
            created_at: current_timestamp(),
        };
        
        key_shares.push(key_share);
    }

    let threshold_data = ThresholdKeyData {
        user_principal: principal,
        key_shares,
        threshold,
        total_shares,
        created_at: current_timestamp(),
        is_active: true,
    };

    THRESHOLD_KEYS.with(|keys| {
        keys.borrow_mut().insert(principal, threshold_data.clone());
    });

    ApiResponse {
        success: true,
        data: Some(threshold_data),
        error: None,
    }
}

#[query]
pub fn get_threshold_keys() -> ApiResponse<ThresholdKeyData> {
    let principal = caller();
    
    match THRESHOLD_KEYS.with(|keys| keys.borrow().get(&principal)) {
        Some(threshold_data) => ApiResponse {
            success: true,
            data: Some(threshold_data),
            error: None,
        },
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("Threshold keys not found".to_string()),
        },
    }
}

// Relationship management
#[update]
pub fn create_relationship(request: CreateRelationshipRequest) -> ApiResponse<Relationship> {
    let principal = caller();
    
    if principal == request.target_user {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("Cannot create relationship with yourself".to_string()),
        };
    }

    // Verify both users exist
    let users_exist = USERS.with(|users| {
        let users = users.borrow();
        users.contains_key(&principal) && users.contains_key(&request.target_user)
    });

    if !users_exist {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("One or both users not found".to_string()),
        };
    }

    let relationship_id = generate_id();
    let now = current_timestamp();

    let relationship = Relationship {
        id: relationship_id.clone(),
        user_a: principal,
        user_b: request.target_user,
        relationship_type: request.relationship_type,
        status: RelationshipStatus::Pending,
        created_at: now,
        updated_at: now,
        metadata: request.metadata,
    };

    RELATIONSHIPS.with(|relationships| {
        relationships.borrow_mut().insert(relationship_id, relationship.clone());
    });

    ApiResponse {
        success: true,
        data: Some(relationship),
        error: None,
    }
}

#[query]
pub fn get_relationships() -> ApiResponse<Vec<Relationship>> {
    let principal = caller();
    
    let user_relationships: Vec<Relationship> = RELATIONSHIPS.with(|relationships| {
        relationships
            .borrow()
            .iter()
            .filter(|(_, relationship)| {
                relationship.user_a == principal || relationship.user_b == principal
            })
            .map(|(_, relationship)| relationship)
            .collect()
    });

    ApiResponse {
        success: true,
        data: Some(user_relationships),
        error: None,
    }
}

// Evidence vault management
#[update]
pub fn upload_evidence(request: UploadEvidenceRequest) -> ApiResponse<EvidenceEntry> {
    let principal = caller();
    
    // Verify user exists
    if !USERS.with(|users| users.borrow().contains_key(&principal)) {
        return ApiResponse {
            success: false,
            data: None,
            error: Some("User not found".to_string()),
        };
    }

    let evidence_id = generate_id();
    let now = current_timestamp();

    let evidence = EvidenceEntry {
        id: evidence_id.clone(),
        owner: principal,
        file_hash: request.file_hash,
        encrypted_data: request.encrypted_data,
        metadata: request.metadata,
        created_at: now,
        upload_cycle_id: request.upload_cycle_id,
        is_revoked: false,
    };

    EVIDENCE_VAULT.with(|vault| {
        vault.borrow_mut().insert(evidence_id, evidence.clone());
    });

    ApiResponse {
        success: true,
        data: Some(evidence),
        error: None,
    }
}

#[query]
pub fn get_evidence_timeline() -> ApiResponse<Vec<EvidenceEntry>> {
    let principal = caller();
    
    let user_evidence: Vec<EvidenceEntry> = EVIDENCE_VAULT.with(|vault| {
        vault
            .borrow()
            .iter()
            .filter(|(_, evidence)| evidence.owner == principal && !evidence.is_revoked)
            .map(|(_, evidence)| evidence)
            .collect()
    });

    ApiResponse {
        success: true,
        data: Some(user_evidence),
        error: None,
    }
}

#[update]
pub fn revoke_evidence(evidence_id: String) -> ApiResponse<bool> {
    let principal = caller();
    
    let result = EVIDENCE_VAULT.with(|vault| {
        let mut vault = vault.borrow_mut();
        match vault.get(&evidence_id) {
            Some(mut evidence) if evidence.owner == principal => {
                evidence.is_revoked = true;
                vault.insert(evidence_id, evidence);
                true
            }
            _ => false,
        }
    });

    ApiResponse {
        success: result,
        data: Some(result),
        error: if result { None } else { Some("Evidence not found or unauthorized".to_string()) },
    }
}

// System information
#[query]
pub fn get_canister_info() -> ApiResponse<HashMap<String, String>> {
    let mut info = HashMap::new();
    info.insert("canister_id".to_string(), id().to_string());
    info.insert("version".to_string(), "1.0.0".to_string());
    info.insert("environment".to_string(), "development".to_string());

    ApiResponse {
        success: true,
        data: Some(info),
        error: None,
    }
}

// Health check
#[query]
pub fn health_check() -> ApiResponse<String> {
    ApiResponse {
        success: true,
        data: Some("OK".to_string()),
        error: None,
    }
}