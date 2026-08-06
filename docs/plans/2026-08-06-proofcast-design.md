# Proofcast Design

Proofcast is a standalone Agent Skill for recording an explicitly requested
command or focused validation flow as an H.264 MP4. The repository exposes one
skill at `skills/proofcast`, allowing the cross-agent `skills` CLI to discover
and install it without a plugin marketplace or host configuration changes.

The skill bundles its executable at `scripts/proofcast`. Claude Code resolves
that executable through `${CLAUDE_SKILL_DIR}`, so installation remains fully
self-contained and does not copy files into a global `bin` directory. Before
recording, the script checks for `asciinema`, `agg`, and `ffmpeg` and reports all
missing binaries in one error. Successful and unsuccessful commands are both
rendered; the script returns the recorded command's exit status.

Tests replace the three external recording tools with deterministic fixtures.
They verify dependency reporting, successful output, failure preservation, and
the skill's safety and bundled-script contract.
