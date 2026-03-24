# Membership

## Approval Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: Request Membership<br/>useRequestGroupMembership
    Pending --> Active: Approve<br/>useApproveGroupMember<br/>Trigger sets approved_by/approved_at
    Pending --> Removed: Reject<br/>useRejectGroupMember
    Active --> Removed: Remove<br/>useRemoveGroupMember
    Removed --> [*]
```

Status transitions: `pending` → `active` (approved) or `removed` (rejected/removed).

## Status Enum

**Type**: `group_member_status` enum

- `pending` - Membership requested, awaiting approval
- `active` - Approved, active member
- `removed` - Rejected or removed

## Approval Metadata

`approved_by` and `approved_at` are set in Convex membership mutations when status becomes `active`.

## Hooks

**Mutations**: `useRequestGroupMembership`, `useApproveGroupMember`, `useRejectGroupMember`, `useRemoveGroupMember`

**Queries**: `useGroupMembers`, `useGroupMembersByStatus`, `useGroupMember`

**Example**: [`src/app/members/db.ts`](../src/app/members/db.ts)

## Authorization

Authorization is enforced by Convex policy helpers (`requireAuthUserId`, `isActiveGroupMember`) in `convex/lib/policy.ts`.
