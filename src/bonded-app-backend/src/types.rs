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

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserSettings {
    pub ai_filters_enabled: bool,
    pub nsfw_filter: bool,
    pub explicit_text_filter: bool,
    pub upload_schedule: String,
    pub geolocation_enabled: bool,
    pub notification_preferences: Vec<String>,
    pub updated_at: u64,
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
// API REQUEST/RESPONSE TYPES
// =======================

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