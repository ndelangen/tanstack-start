export type GroupMemberStatus = 'pending' | 'active' | 'removed';

export interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  slug: string;
}

export interface GroupRow {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface GroupMemberRow {
  group_id: string;
  user_id: string;
  status: GroupMemberStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface FactionRow {
  id: string;
  owner_id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  group_id: string | null;
  slug: string;
}

export interface RulesetRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  group_id: string | null;
  is_deleted: boolean;
  image_cover: string | null;
}

export interface RulesetFactionRow {
  ruleset_id: number;
  faction_id: string;
}

export interface FaqItemRow {
  id: number;
  ruleset_id: number;
  question: string;
  asked_by: string;
  created_at: string;
  updated_at: string;
  accepted_answer_id: number | null;
}

export interface FaqAnswerRow {
  id: number;
  faq_item_id: number;
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
