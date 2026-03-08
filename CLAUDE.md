# OpenHR — Claude Code Instructions

All project instructions are maintained in `Others/CLAUDE.md`. Read that file for full context.

## Git Workflow — MUST FOLLOW

After completing any code changes:
1. Stage the changed files: `git add <specific files>` (never use `git add .` or `git add -A`)
2. Update `src/data/changelog.ts` with a new entry describing the change (add to the first release group if same date, or create a new group at the top)
3. Commit with a descriptive message: `git commit -m "description of changes"`
4. Push to the current branch: `git push origin <current-branch>`

Always push immediately after committing. Never leave unpushed commits.
