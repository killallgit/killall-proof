
# Proofcast

_A bodycam for AI_

<div align="center">

<img src="assets/arnie.gif" alt="Christine (1983)" width="640">

</div>

Proofcast is an AI bodycam that lets you record the terminal output that _it_
sees, uncovering all the gruesome details...

> ___what do you mean it was only staging!?___

---

## Install from a marketplace

Claude Code:

```bash
claude plugin marketplace add killallgit/killall-proof
claude plugin install proofcast@killall-proof
```

To share the Claude Code setup with one project, run from that project:

```bash
claude plugin marketplace add killallgit/killall-proof --scope project
claude plugin install proofcast@killall-proof --scope project
```

Codex:

```bash
codex plugin marketplace add killallgit/killall-proof
codex plugin add proofcast@killall-proof
```

For a local checkout, pass its path to `plugin marketplace add`, then install
the plugin by its `proofcast@killall-proof` identifier. `claude plugin install`
does not accept a repository path.

## Install as an individual skill

```bash
npx skills@latest add killallgit/killall-proof \
  --skill proofcast \
  --agent claude-code \
  --global \
  --yes
```

**Pre-reqs**

| | |
|---|---|
| `asciinema` 3.0+ | required |
| `agg` | optional — adds a gif alongside each recording |

After editing `skills/proofcast/`, run `python3 scripts/sync-plugin.py` and
commit the updated `plugins/proofcast/` copy used by the marketplaces.

## How to use

Tell your agent **"prove it"** about code or command behavior to trigger
Proofcast. You can also ask to record terminal output or "turn on the bodycam".
Recordings land in `.proofcast` next to wherever it ran:

```
.proofcast/index.html
.proofcast/<slug>/<timestamp>.cast
.proofcast/<slug>/<timestamp>.stdout.log
.proofcast/<slug>/<timestamp>.gif
```

Open `index.html` from disk. It lists every recording and replays them as real
text you can pause, scrub, and copy from. After recording, the agent asks
**"Would you like me to open the recording webpage in your browser?"** and
opens it if you agree (or already asked it to).

The proof must show the commands that actually run. Multi-step flows record
each command separately under the same slug. If a script is needed, the agent
inspects it and records it with execution tracing: `bash -x ./script.sh` for
Bash, including existing project scripts. Child scripts need their own tracing.
A wrapper that only prints selected commands or success messages hides the
work; its printed claims are not proof of execution.

## Accountability, as ever, has limits

Output that scrolls faster than the terminal can draw collapses into a single
frame, so the footage shows the aftermath rather than the incident. The full
text survives in the log, which nobody watches.

Everything the agent printed is captured verbatim, **including your secrets**.
Execution traces also expose expanded arguments and assignments. Proofcast
does not redact them. Add `.proofcast/` to `.gitignore`.

Recordings are kept until someone deletes them, and someone always does.
