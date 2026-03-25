# Skills Index

This index helps humans and agents choose the right local skill quickly.

## Conventions

- Every skill must include frontmatter `name` and `description` with trigger wording (`Use when ...`).
- Keep `SKILL.md` focused; move deep detail to `REFERENCE.md`, `references/`, or `EXAMPLES.md` when needed.
- Prefer Cursor-oriented wording (`Subagent`, parallel runs, read-only vs write) over tool names that may not exist in all environments.
- Keep links valid and local to this repo.

## Skill precedence

- For UI implementation/refactors, prefer `ui-create-standards` over `grill-me`.
- Use `grill-me` for broad design stress-testing outside domain-specific skills.
- Use `design-an-interface` for interface shape exploration.
- Use `improve-codebase-architecture` for larger coupling/refactor discovery and RFC framing.

## Available skills

- `ui-create-standards`: UI implementation standards, hard-stop guardrails, and decision-log enforcement.
- `grill-me`: General plan/design pressure testing through structured questioning.
- `write-a-skill`: Authoring and structuring new local skills.
- `design-an-interface`: Generate and compare radically different interface designs.
- `improve-codebase-architecture`: Find architectural friction and propose deep-module refactors.
- `convex-migration-helper`: Safe widen-migrate-narrow migration workflows.
- `convex-performance-audit`: Convex read/write hot-path and OCC performance audit workflow.
- `convex-setup-auth`: Convex auth provider/setup and authorization guidance.
- `convex-quickstart`: Convex quickstart guidance (mostly for greenfield setup).

## Maintenance checklist

- When adding a new decision in `docs/technical/ui-design-decisions.md`, verify `ui-create-standards` still reflects it.
- When changing Convex migration guidance, update both `convex-migration-helper` and linked docs.
- After edits, validate referenced file paths and run markdown diagnostics.
