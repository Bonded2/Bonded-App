import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AcceptInviteResponse {
  'relationship' : Relationship,
  'public_key' : Uint8Array | number[],
  'relationship_id' : string,
  'user_key_share' : Uint8Array | number[],
}
export type BondedResult = { 'Ok' : Uint8Array | number[] } |
  { 'Err' : string };
export type BondedResult_1 = { 'Ok' : CreateRelationshipResponse } |
  { 'Err' : string };
export type BondedResult_10 = { 'Ok' : SendEmailResponse } |
  { 'Err' : string };
export type BondedResult_11 = { 'Ok' : PartnerInvite } |
  { 'Err' : string };
export type BondedResult_12 = { 'Ok' : AcceptInviteResponse } |
  { 'Err' : string };
export type BondedResult_2 = { 'Ok' : string } |
  { 'Err' : string };
export type BondedResult_3 = { 'Ok' : Evidence } |
  { 'Err' : string };
export type BondedResult_4 = { 'Ok' : Relationship } |
  { 'Err' : string };
export type BondedResult_5 = { 'Ok' : TimelineResponse } |
  { 'Err' : string };
export type BondedResult_6 = { 'Ok' : UserProfile } |
  { 'Err' : string };
export type BondedResult_7 = { 'Ok' : Array<Relationship> } |
  { 'Err' : string };
export type BondedResult_8 = { 'Ok' : UserSettings } |
  { 'Err' : string };
export type BondedResult_9 = { 'Ok' : CreatePartnerInviteResponse } |
  { 'Err' : string };
export interface CreatePartnerInviteRequest {
  'partner_email' : string,
  'metadata' : [] | [string],
  'inviter_name' : string,
  'frontend_url' : [] | [string],
  'expires_at' : bigint,
}
export interface CreatePartnerInviteResponse {
  'invite_id' : string,
  'invite_link' : string,
  'expires_at' : bigint,
}
export interface CreateRelationshipRequest { 'partner_principal' : Principal }
export interface CreateRelationshipResponse {
  'public_key' : Uint8Array | number[],
  'relationship_id' : string,
  'user_key_share' : Uint8Array | number[],
}
export interface Evidence {
  'id' : string,
  'encrypted_data' : Uint8Array | number[],
  'signature' : [] | [Uint8Array | number[]],
  'metadata' : EvidenceMetadata,
  'hash' : string,
  'uploader' : Principal,
  'relationship_id' : string,
  'upload_timestamp' : bigint,
}
export interface EvidenceMetadata {
  'tags' : Array<string>,
  'content_type' : string,
  'description' : [] | [string],
  'timestamp' : bigint,
  'location' : [] | [string],
}
export type InviteStatus = { 'Accepted' : null } |
  { 'Cancelled' : null } |
  { 'Expired' : null } |
  { 'Pending' : null };
export interface PartnerInvite {
  'id' : string,
  'status' : InviteStatus,
  'partner_email' : string,
  'inviter_principal' : Principal,
  'metadata' : [] | [string],
  'inviter_name' : string,
  'created_at' : bigint,
  'expires_at' : bigint,
}
export interface Relationship {
  'id' : string,
  'status' : RelationshipStatus,
  'bonded_key_share' : Uint8Array | number[],
  'created_at' : bigint,
  'partner1' : Principal,
  'partner2' : [] | [Principal],
  'last_activity' : bigint,
  'evidence_count' : bigint,
}
export type RelationshipStatus = { 'Terminated' : null } |
  { 'Active' : null } |
  { 'Pending' : null };
export interface SendEmailResponse {
  'provider' : string,
  'success' : boolean,
  'message_id' : string,
}
export interface SendInviteEmailRequest {
  'subject' : string,
  'recipient_email' : string,
  'email_content' : string,
}
export interface TimelineQuery {
  'category_filter' : [] | [string],
  'page' : [] | [number],
  'end_date' : [] | [bigint],
  'start_date' : [] | [bigint],
  'relationship_id' : string,
}
export interface TimelineResponse {
  'evidence' : Array<Evidence>,
  'total_count' : bigint,
  'has_more' : boolean,
}
export interface UpdateSettingsRequest {
  'notification_preferences' : [] | [Array<string>],
  'upload_schedule' : [] | [string],
  'explicit_text_filter' : [] | [boolean],
  'nsfw_filter' : [] | [boolean],
  'profile_metadata' : [] | [string],
  'geolocation_enabled' : [] | [boolean],
  'ai_filters_enabled' : [] | [boolean],
}
export interface UserProfile {
  'total_evidence_uploaded' : bigint,
  'principal' : Principal,
  'kyc_verified' : boolean,
  'created_at' : bigint,
  'last_seen' : bigint,
  'relationships' : Array<string>,
}
export interface UserSettings {
  'updated_at' : bigint,
  'notification_preferences' : Array<string>,
  'upload_schedule' : string,
  'explicit_text_filter' : boolean,
  'nsfw_filter' : boolean,
  'profile_metadata' : [] | [string],
  'geolocation_enabled' : boolean,
  'ai_filters_enabled' : boolean,
}
export interface _SERVICE {
  'accept_partner_invite' : ActorMethod<[string], BondedResult_12>,
  'accept_relationship' : ActorMethod<[string], BondedResult>,
  'create_partner_invite' : ActorMethod<
    [CreatePartnerInviteRequest],
    BondedResult_9
  >,
  'create_relationship' : ActorMethod<
    [CreateRelationshipRequest],
    BondedResult_1
  >,
  'delete_evidence' : ActorMethod<[string, string], BondedResult_2>,
  'delete_user_account' : ActorMethod<[], BondedResult_2>,
  'get_canister_stats' : ActorMethod<[], Array<[string, bigint]>>,
  'get_evidence_by_id' : ActorMethod<[string], BondedResult_3>,
  'get_key_share' : ActorMethod<[string], BondedResult>,
  'get_partner_invite' : ActorMethod<[string], BondedResult_11>,
  'get_relationship' : ActorMethod<[string], BondedResult_4>,
  'get_timeline' : ActorMethod<[string, number, number], BondedResult_5>,
  'get_timeline_with_filters' : ActorMethod<[TimelineQuery], BondedResult_5>,
  'get_user_profile' : ActorMethod<[], BondedResult_6>,
  'get_user_relationships' : ActorMethod<[], BondedResult_7>,
  'get_user_settings' : ActorMethod<[], BondedResult_8>,
  'greet' : ActorMethod<[string], string>,
  'health_check' : ActorMethod<[], string>,
  'register_user' : ActorMethod<[[] | [string]], BondedResult_2>,
  'send_invite_email' : ActorMethod<[SendInviteEmailRequest], BondedResult_10>,
  'terminate_relationship' : ActorMethod<[string], BondedResult_2>,
  'update_face_embedding' : ActorMethod<[Array<number>], BondedResult_2>,
  'update_user_settings' : ActorMethod<[UpdateSettingsRequest], BondedResult_2>,
  'upload_evidence' : ActorMethod<
    [string, Uint8Array | number[], EvidenceMetadata],
    BondedResult_2
  >,
  'verify_kyc' : ActorMethod<[], BondedResult_2>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
