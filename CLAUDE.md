@AGENTS.md

## Claude Code specifics

- Playbooks from the table above are available as skills (`.claude/skills/`); invoke the
  matching one before starting a task.
- A PostToolUse hook runs Prettier on files you edit (`scripts/hooks/format-file.mjs`), so
  don't spend turns on formatting.
- `.claude/agents/reviewer.md` is a project-specific reviewer: use it on your diff before
  the final commit of a feature.
- Project settings pre-approve the npm scripts and local git commands; `git push`, tags and
  publishing always ask.
