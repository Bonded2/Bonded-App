use candid::{CandidType, Decode, Encode, Principal};
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

// =======================
// CORE DATA STRUCTURES
// =======================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EvidenceMetadata {
    pub timestamp: u64,
    pub content_type: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Evidence {
    pub id: String,
    pub relationship_id: String,
    pub encrypted_data: Vec<u8>,
    pub metadata: EvidenceMetadata,
    pub upload_timestamp: u64,
    pub hash: String,
    pub uploader: Principal,
    pub signature: Option<Vec<u8>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum RelationshipStatus {
    Pending,
    Active,
    Terminated,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Relationship {
    pub id: String,
    pub partner1: Principal,
    pub partner2: Option<Principal>,
    pub status: RelationshipStatus,
    pub created_at: u64,
    pub bonded_key_share: Vec<u8>, // Bonded's share of the 2-of-3 threshold key
    pub evidence_count: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserProfile {
    pub principal: Principal,
    pub created_at: u64,
    pub relationships: Vec<String>,
    pub total_evidence_uploaded: u64,
    pub kyc_verified: bool,
    pub last_seen: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct UserSettings {
    pub ai_filters_enabled: bool,
    pub nsfw_filter: bool,
    pub explicit_text_filter: bool,
    pub upload_schedule: String,
    pub geolocation_enabled: bool,
    pub notification_preferences: Vec<String>,
    pub profile_metadata: Option<String>,
    pub updated_at: u64,
}

// =======================
// CLIENT DATA STORAGE
// =======================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TimelineData {
    pub id: String,
    pub user: Principal,
    pub timeline_items: Vec<String>, // JSON encoded timeline data
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserFaceEmbedding {
    pub user: Principal,
    pub embedding_data: Vec<f32>,
    pub partner_id: Option<Principal>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AutoScannerSettings {
    pub user: Principal,
    pub settings_data: String, // JSON encoded settings
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CaptureSettings {
    pub user: Principal,
    pub settings_data: String, // JSON encoded capture settings
    pub file_type_overrides: String, // JSON encoded file type overrides
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EmailLog {
    pub id: String,
    pub user: Principal,
    pub log_data: String, // JSON encoded email log
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GeolocationCache {
    pub cache_key: String,
    pub user: Option<Principal>, // None for global cache
    pub cache_data: String, // JSON encoded location data
    pub expires_at: u64,
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SchedulerSettings {
    pub user: Principal,
    pub settings_data: String, // JSON encoded scheduler settings
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ProcessedContent {
    pub id: String,
    pub user: Principal,
    pub relationship_id: Option<String>,
    pub content_data: String, // JSON encoded content
    pub content_type: String, // "timeline", "timestamp_folder", "media_import", etc.
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserKeyShare {
    pub key_id: String, // relationship_id + user_principal
    pub user: Principal,
    pub relationship_id: String,
    pub key_share: Vec<u8>, // Encrypted key share for this user
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AuditLogEntry {
    pub id: String,
    pub user: Principal,
    pub action: String,
    pub timestamp: u64,
    pub metadata: Option<String>,
}

// =======================
// PARTNER INVITE SYSTEM
// =======================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum InviteStatus {
    Pending,
    Accepted,
    Expired,
    Cancelled,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PartnerInvite {
    pub id: String,
    pub inviter_principal: Principal,
    pub partner_email: String,
    pub inviter_name: String,
    pub status: InviteStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub metadata: Option<String>,
}

// =======================
// API REQUEST/RESPONSE TYPES
// =======================

#[derive(CandidType, Serialize, Deserialize)]
pub struct CreatePartnerInviteRequest {
    pub partner_email: String,
    pub inviter_name: String,
    pub expires_at: u64,
    pub metadata: Option<String>,
    pub frontend_url: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct CreatePartnerInviteResponse {
    pub invite_id: String,
    pub invite_link: String,
    pub expires_at: u64,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct SendInviteEmailRequest {
    pub recipient_email: String,
    pub email_content: String,
    pub subject: String,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct SendEmailResponse {
    pub success: bool,
    pub message_id: String,
    pub provider: String,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct AcceptInviteResponse {
    pub relationship_id: String,
    pub relationship: Relationship,
    pub user_key_share: Vec<u8>,
    pub public_key: Vec<u8>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct UserDashboardData {
    pub profile: UserProfile,
    pub settings: UserSettings,
    pub relationships: Vec<Relationship>,
    pub recent_evidence: Vec<Evidence>,
    pub last_updated: u64,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct CreateRelationshipRequest {
    pub partner_principal: Principal,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct CreateRelationshipResponse {
    pub relationship_id: String,
    pub user_key_share: Vec<u8>,
    pub public_key: Vec<u8>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct UploadEvidenceRequest {
    pub relationship_id: String,
    pub encrypted_data: Vec<u8>,
    pub metadata: EvidenceMetadata,
    pub hash: String,
    pub signature: Option<Vec<u8>>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct TimelineQuery {
    pub relationship_id: String,
    pub page: Option<u32>,
    pub category_filter: Option<String>,
    pub start_date: Option<u64>,
    pub end_date: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct TimelineResponse {
    pub evidence: Vec<Evidence>,
    pub total_count: u64,
    pub has_more: bool,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct UpdateSettingsRequest {
    pub ai_filters_enabled: Option<bool>,
    pub nsfw_filter: Option<bool>,
    pub explicit_text_filter: Option<bool>,
    pub upload_schedule: Option<String>,
    pub geolocation_enabled: Option<bool>,
    pub notification_preferences: Option<Vec<String>>,
    pub profile_metadata: Option<String>,
}

// =======================
// RESULT TYPE
// =======================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum BondedResult<T> {
    Ok(T),
    Err(String),
}

impl<T> BondedResult<T> {
    pub fn ok(value: T) -> Self {
        BondedResult::Ok(value)
    }
    
    pub fn err(msg: &str) -> Self {
        BondedResult::Err(msg.to_string())
    }
}

// =======================
// STORABLE IMPLEMENTATIONS
// =======================

impl Storable for Evidence {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for Relationship {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for UserProfile {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for UserSettings {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for PartnerInvite {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for AuditLogEntry {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for TimelineData {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for UserFaceEmbedding {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for AutoScannerSettings {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for CaptureSettings {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for EmailLog {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for GeolocationCache {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for SchedulerSettings {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for ProcessedContent {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

impl Storable for UserKeyShare {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
}

// =======================
// BFT TYPES
// =======================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum BftResult<T> {
    Ok(T),
    Err(String),
}

impl<T> BftResult<T> {
    pub fn ok(value: T) -> Self {
        BftResult::Ok(value)
    }
    
    pub fn err(msg: &str) -> Self {
        BftResult::Err(msg.to_string())
    }
}

impl<T> From<Result<T, String>> for BftResult<T> {
    fn from(result: Result<T, String>) -> Self {
        match result {
            Ok(value) => BftResult::Ok(value),
            Err(error) => BftResult::Err(error),
        }
    }
}

// Helper macro to make ? operator work with BftResult
#[macro_export]
macro_rules! try_bft {
    ($expr:expr) => {
        match $expr {
            Ok(val) => val,
            Err(err) => return BftResult::err(&err.to_string()),
        }
    };
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftSystemStatus {
    pub is_active: bool,
    pub health_score: f64,
    pub total_operations: u64,
    pub successful_operations: u64,
    pub failed_operations: u64,
    pub byzantine_detections: u64,
    pub active_nodes: u64,
    pub byzantine_nodes: u64,
    pub last_health_check: u64,
    pub fault_tolerance: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftIntegrityReport {
    pub total_checked: u64,
    pub integrity_passed: u64,
    pub integrity_failed: u64,
    pub corrupted_entries: Vec<String>,
    pub byzantine_nodes: Vec<Principal>,
    pub recovery_needed: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftNodeStatus {
    pub is_active: bool,
    pub health_score: f64,
    pub alerts: Vec<String>,
    pub last_seen: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftHealthReport {
    pub timestamp: u64,
    pub overall_health_score: f64,
    pub consensus_status: String,
    pub storage_integrity: BftIntegrityReport,
    pub node_statuses: std::collections::HashMap<Principal, BftNodeStatus>,
    pub recommendations: Vec<String>,
    pub critical_issues: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftRecoveryOperation {
    pub entry_id: String,
    pub operation_type: String,
    pub status: String,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftRecoveryReport {
    pub timestamp: u64,
    pub total_corrupted: u64,
    pub successfully_recovered: u64,
    pub failed_recoveries: u64,
    pub recovery_operations: Vec<BftRecoveryOperation>,
    pub system_restored: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftNetworkTopology {
    pub total_nodes: u64,
    pub active_nodes: Vec<Principal>,
    pub byzantine_nodes: Vec<Principal>,
    pub fault_tolerance: u32,
    pub consensus_threshold: u32,
    pub network_health: f64,
    pub last_updated: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftEvidenceResponse {
    pub evidence_id: String,
    pub bft_operation_id: String,
    pub consensus_proof: Vec<u8>,
    pub integrity_hash: String,
    pub replication_status: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftTimelineResponse {
    pub evidence: Vec<Evidence>,
    pub total_count: u64,
    pub has_more: bool,
    pub integrity_report: BftIntegrityReport,
    pub bft_consensus_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftInviteResponse {
    pub invite_id: String,
    pub invite_link: String,
    pub expires_at: u64,
    pub bft_operation_id: String,
    pub integrity_proof: Vec<u8>,
    pub consensus_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftAcceptInviteResponse {
    pub relationship_id: String,
    pub relationship: Relationship,
    pub user_key_share: Vec<u8>,
    pub public_key: Vec<u8>,
    pub bft_consensus_proof: Vec<u8>,
    pub creation_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftCreateRelationshipResponse {
    pub relationship_id: String,
    pub user_key_share: Vec<u8>,
    pub public_key: Vec<u8>,
    pub bft_operation_id: String,
    pub consensus_proof: Vec<u8>,
    pub creation_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftInviteDetails {
    pub invite: PartnerInvite,
    pub integrity_proof: Vec<u8>,
    pub verification_timestamp: u64,
    pub time_until_expiry: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BftRelationshipDetails {
    pub relationship: Relationship,
    pub integrity_proof: Vec<u8>,
    pub verification_timestamp: u64,
    pub consensus_status: String,
}