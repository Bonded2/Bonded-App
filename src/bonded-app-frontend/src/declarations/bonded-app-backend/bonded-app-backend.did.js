export const idlFactory = ({ IDL }) => {
  const RelationshipStatus = IDL.Variant({
    'Terminated' : IDL.Null,
    'Active' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const Relationship = IDL.Record({
    'id' : IDL.Text,
    'status' : RelationshipStatus,
    'bonded_key_share' : IDL.Vec(IDL.Nat8),
    'created_at' : IDL.Nat64,
    'partner1' : IDL.Principal,
    'partner2' : IDL.Opt(IDL.Principal),
    'last_activity' : IDL.Nat64,
    'evidence_count' : IDL.Nat64,
  });
  const AcceptInviteResponse = IDL.Record({
    'relationship' : Relationship,
    'public_key' : IDL.Vec(IDL.Nat8),
    'relationship_id' : IDL.Text,
    'user_key_share' : IDL.Vec(IDL.Nat8),
  });
  const BondedResult_12 = IDL.Variant({
    'Ok' : AcceptInviteResponse,
    'Err' : IDL.Text,
  });
  const BondedResult = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Nat8),
    'Err' : IDL.Text,
  });
  const CreatePartnerInviteRequest = IDL.Record({
    'partner_email' : IDL.Text,
    'metadata' : IDL.Opt(IDL.Text),
    'inviter_name' : IDL.Text,
    'frontend_url' : IDL.Opt(IDL.Text),
    'expires_at' : IDL.Nat64,
  });
  const CreatePartnerInviteResponse = IDL.Record({
    'invite_id' : IDL.Text,
    'invite_link' : IDL.Text,
    'expires_at' : IDL.Nat64,
  });
  const BondedResult_9 = IDL.Variant({
    'Ok' : CreatePartnerInviteResponse,
    'Err' : IDL.Text,
  });
  const CreateRelationshipRequest = IDL.Record({
    'partner_principal' : IDL.Principal,
  });
  const CreateRelationshipResponse = IDL.Record({
    'public_key' : IDL.Vec(IDL.Nat8),
    'relationship_id' : IDL.Text,
    'user_key_share' : IDL.Vec(IDL.Nat8),
  });
  const BondedResult_1 = IDL.Variant({
    'Ok' : CreateRelationshipResponse,
    'Err' : IDL.Text,
  });
  const BondedResult_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const EvidenceMetadata = IDL.Record({
    'tags' : IDL.Vec(IDL.Text),
    'content_type' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Nat64,
    'location' : IDL.Opt(IDL.Text),
  });
  const Evidence = IDL.Record({
    'id' : IDL.Text,
    'encrypted_data' : IDL.Vec(IDL.Nat8),
    'signature' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'metadata' : EvidenceMetadata,
    'hash' : IDL.Text,
    'uploader' : IDL.Principal,
    'relationship_id' : IDL.Text,
    'upload_timestamp' : IDL.Nat64,
  });
  const BondedResult_3 = IDL.Variant({ 'Ok' : Evidence, 'Err' : IDL.Text });
  const InviteStatus = IDL.Variant({
    'Accepted' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Expired' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const PartnerInvite = IDL.Record({
    'id' : IDL.Text,
    'status' : InviteStatus,
    'partner_email' : IDL.Text,
    'inviter_principal' : IDL.Principal,
    'metadata' : IDL.Opt(IDL.Text),
    'inviter_name' : IDL.Text,
    'created_at' : IDL.Nat64,
    'expires_at' : IDL.Nat64,
  });
  const BondedResult_11 = IDL.Variant({
    'Ok' : PartnerInvite,
    'Err' : IDL.Text,
  });
  const BondedResult_4 = IDL.Variant({ 'Ok' : Relationship, 'Err' : IDL.Text });
  const TimelineResponse = IDL.Record({
    'evidence' : IDL.Vec(Evidence),
    'total_count' : IDL.Nat64,
    'has_more' : IDL.Bool,
  });
  const BondedResult_5 = IDL.Variant({
    'Ok' : TimelineResponse,
    'Err' : IDL.Text,
  });
  const TimelineQuery = IDL.Record({
    'category_filter' : IDL.Opt(IDL.Text),
    'page' : IDL.Opt(IDL.Nat32),
    'end_date' : IDL.Opt(IDL.Nat64),
    'start_date' : IDL.Opt(IDL.Nat64),
    'relationship_id' : IDL.Text,
  });
  const UserProfile = IDL.Record({
    'total_evidence_uploaded' : IDL.Nat64,
    'principal' : IDL.Principal,
    'kyc_verified' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'last_seen' : IDL.Nat64,
    'relationships' : IDL.Vec(IDL.Text),
  });
  const BondedResult_6 = IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text });
  const BondedResult_7 = IDL.Variant({
    'Ok' : IDL.Vec(Relationship),
    'Err' : IDL.Text,
  });
  const UserSettings = IDL.Record({
    'updated_at' : IDL.Nat64,
    'notification_preferences' : IDL.Vec(IDL.Text),
    'upload_schedule' : IDL.Text,
    'explicit_text_filter' : IDL.Bool,
    'nsfw_filter' : IDL.Bool,
    'profile_metadata' : IDL.Opt(IDL.Text),
    'geolocation_enabled' : IDL.Bool,
    'ai_filters_enabled' : IDL.Bool,
  });
  const BondedResult_8 = IDL.Variant({ 'Ok' : UserSettings, 'Err' : IDL.Text });
  const SendInviteEmailRequest = IDL.Record({
    'subject' : IDL.Text,
    'recipient_email' : IDL.Text,
    'email_content' : IDL.Text,
  });
  const SendEmailResponse = IDL.Record({
    'provider' : IDL.Text,
    'success' : IDL.Bool,
    'message_id' : IDL.Text,
  });
  const BondedResult_10 = IDL.Variant({
    'Ok' : SendEmailResponse,
    'Err' : IDL.Text,
  });
  const UpdateSettingsRequest = IDL.Record({
    'notification_preferences' : IDL.Opt(IDL.Vec(IDL.Text)),
    'upload_schedule' : IDL.Opt(IDL.Text),
    'explicit_text_filter' : IDL.Opt(IDL.Bool),
    'nsfw_filter' : IDL.Opt(IDL.Bool),
    'profile_metadata' : IDL.Opt(IDL.Text),
    'geolocation_enabled' : IDL.Opt(IDL.Bool),
    'ai_filters_enabled' : IDL.Opt(IDL.Bool),
  });
  return IDL.Service({
    'accept_partner_invite' : IDL.Func([IDL.Text], [BondedResult_12], []),
    'accept_relationship' : IDL.Func([IDL.Text], [BondedResult], []),
    'create_partner_invite' : IDL.Func(
        [CreatePartnerInviteRequest],
        [BondedResult_9],
        [],
      ),
    'create_relationship' : IDL.Func(
        [CreateRelationshipRequest],
        [BondedResult_1],
        [],
      ),
    'delete_evidence' : IDL.Func([IDL.Text, IDL.Text], [BondedResult_2], []),
    'delete_user_account' : IDL.Func([], [BondedResult_2], []),
    'get_canister_stats' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64))],
        ['query'],
      ),
    'get_evidence_by_id' : IDL.Func([IDL.Text], [BondedResult_3], ['query']),
    'get_key_share' : IDL.Func([IDL.Text], [BondedResult], ['query']),
    'get_partner_invite' : IDL.Func([IDL.Text], [BondedResult_11], ['query']),
    'get_relationship' : IDL.Func([IDL.Text], [BondedResult_4], ['query']),
    'get_timeline' : IDL.Func(
        [IDL.Text, IDL.Nat32, IDL.Nat32],
        [BondedResult_5],
        ['query'],
      ),
    'get_timeline_with_filters' : IDL.Func(
        [TimelineQuery],
        [BondedResult_5],
        ['query'],
      ),
    'get_user_profile' : IDL.Func([], [BondedResult_6], ['query']),
    'get_user_relationships' : IDL.Func([], [BondedResult_7], ['query']),
    'get_user_settings' : IDL.Func([], [BondedResult_8], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
    'register_user' : IDL.Func([IDL.Opt(IDL.Text)], [BondedResult_2], []),
    'send_invite_email' : IDL.Func(
        [SendInviteEmailRequest],
        [BondedResult_10],
        [],
      ),
    'terminate_relationship' : IDL.Func([IDL.Text], [BondedResult_2], []),
    'update_face_embedding' : IDL.Func(
        [IDL.Vec(IDL.Float32)],
        [BondedResult_2],
        [],
      ),
    'update_user_settings' : IDL.Func(
        [UpdateSettingsRequest],
        [BondedResult_2],
        [],
      ),
    'upload_evidence' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), EvidenceMetadata],
        [BondedResult_2],
        [],
      ),
    'verify_kyc' : IDL.Func([], [BondedResult_2], []),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
