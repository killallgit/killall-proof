
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
.proofcast/<slug>/<timestamp>.meta.json
.proofcast/<slug>/<timestamp>.gif
```

Open `index.html` from disk. It lists every recording and replays them as real
text you can pause, scrub, and copy from. After recording, the agent asks
**"Would you like me to open the recording webpage in your browser?"** and
opens it if you agree (or already asked it to).

The page opens the newest capture without autoplay, with history underneath.
Each capture includes an **Assertion** and **Justification** (one or two short
sentences total), the actual shell-quoted command, and its exit status.
The context describes the intended check; neither the description nor exit
status 0 is a verified verdict. Older recordings still play without context.

Playback has a timeline and one compact control row: **Back 5**, play/pause,
**Fwd 5**, and a speed button that cycles through **0.5x / 1x / 1.5x / 2x**.
Controls remain touch-friendly on mobile. These control the
terminal recording, not the optional GIF.
**Auto-play next** is on by default: after playback finishes, it starts the next
recording down the displayed list and stops at the end. The first recording
still waits for Play. The text log link sits opposite the auto-play toggle.

Recordings are disposable. **Save** downloads the selected capture,
context, and text log as one offline HTML file; your browser chooses the save
location. The GIF stays a separate optional download. Confirm the export was
saved before removing the original.
**Nuke proof** covers all recordings listed in the index, asks for folder access
and confirmation, and deletes only their files and the index. It leaves unrelated
files, exports, empty folders, and anything the recorded commands created alone.
Browsers without folder-write access (including most mobile browsers) show exact
cleanup commands instead; showing commands does not delete anything.

The proof must show the commands that actually run. Multi-step flows record
each command separately under the same slug. If a script is needed, the agent
inspects it and adds execution tracing while preserving the original interpreter
path and startup options, including shebang flags. For `#!/path/to/bash -e`, use
`/path/to/bash -ex ./script.sh` so tracing keeps the original stop-on-failure behavior.
This includes existing project scripts. Child scripts need their own tracing.
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

## Evaluating changes

Run `python3 -m unittest discover -s tests` for recorder/index regressions.
`evals/evals.json` contains planning scenarios for comparing agent behavior:
traced nested scripts, incomplete evidence despite exit 0, and failure followed
by export/cleanup. These check instruction following, not actual infrastructure.
With Playwright and its Chromium browser available, `node tests/browser.cjs`
checks offline playback, export, mobile layouts, and cleanup using fake folder
handles. Browser tooling is development-only; the shipped page needs none.
