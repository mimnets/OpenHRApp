---
name: User prefers thorough audits with cleanup
description: When asked to "check for problems," do comprehensive audit, migrate stale dependencies, clean unnecessary files, and document everything to memory
type: feedback
originSessionId: f9fb8799-c860-4f92-88f7-d834cf191da5
---
Rule: When the user asks for a deep review, audit, or problem check on the project, go comprehensive.

**Why**: User values thoroughness — on 2026-06-08 they asked for deep look + PB→Supabase migration + file cleanup + memory documentation all at once. Doing one piece without the others would require a second pass.

**How to apply**: When the user asks to "have a deep look", "check for problems", or "audit the app":
1. Explore the full codebase across multiple dimensions (services, config, dependencies, build scripts, Edge Functions)
2. Look for stale dependencies, partial migrations, code that references dead backends
3. Migrate any remaining references to deprecated systems
4. Clean truly unnecessary files (PB backups, duplicate copies, .DS_Store, root junk)
5. Save findings to project memory (indexed in MEMORY.md) for future reference
6. Verify build succeeds after changes
