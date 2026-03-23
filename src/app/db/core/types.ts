export type GroupMemberStatus = 'pending' | 'active' | 'removed';

export interface ProfileRow {
  id: string;
  _id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  slug: string;
}

export interface GroupRow {
  id: string;
  _id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface GroupMemberRow {
  id: string;
  _id: string;
  group_id: string;
  user_id: string;
  status: GroupMemberStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface FactionRow {
  id: string;
  _id: string;
  owner_id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  group_id: string | null;
  slug: string;
}

export interface RulesetRow {
  id: string;
  _id: string;
  name: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  group_id: string | null;
  is_deleted: boolean;
  image_cover: string | null;
}

export interface RulesetFactionRow {
  id: string;
  _id: string;
  ruleset_id: string;
  faction_id: string;
}

export interface FaqItemRow {
  id: string;
  _id: string;
  ruleset_id: string;
  question: string;
  asked_by: string;
  created_at: string;
  updated_at: string;
  accepted_answer_id: string | null;
}

export interface FaqAnswerRow {
  id: string;
  _id: string;
  faq_item_id: string;
  answer: string;
  answered_by: string;
  created_at: string;
}

export interface TableMap {
  profiles: ProfileRow;
  groups: GroupRow;
  group_members: GroupMemberRow;
  factions: FactionRow;
  rulesets: RulesetRow;
  ruleset_factions: RulesetFactionRow;
  faq_items: FaqItemRow;
  faq_answers: FaqAnswerRow;
}

export type Tables<T extends keyof TableMap> = TableMap[T];
export type TablesInsert<T extends keyof TableMap> = TableMap[T];
export type TablesUpdate<T extends keyof TableMap> = Partial<TableMap[T]>;

export type Enums<T extends 'group_member_status'> = T extends 'group_member_status'
  ? GroupMemberStatus
  : never;
