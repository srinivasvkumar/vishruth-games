# Cluster Rush — Boss Decisions

Append-only log. Format: date, decision, rationale, context.

## 2026-09-05
- **Bootstrap `boss/` directory structure.** Rationale: Playbook §2 mandates persistent state; directory did not exist. No gameplay changes made — this is pure state infrastructure.
- **Remove `messaging` from reviewer's `platform_toolsets.cli`.** Rationale: invalid toolset blocked all reviewer CLI invocations. Backup at `/tmp/reviewer_config_pre_mcp_trim.yaml`. Not yet verified via T0.5 probe.
