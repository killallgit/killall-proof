import os
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
PROOFCAST = REPO / "skills" / "proofcast" / "scripts" / "proofcast"
SKILL = REPO / "skills" / "proofcast" / "SKILL.md"


class ProofcastTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def _tool(self, name, body):
        path = self.bin / name
        path.write_text(body)
        path.chmod(0o755)

    def _recording_tools(self):
        self._tool(
            "asciinema",
            """#!/usr/bin/env bash
set -u
if [ "${1:-}" = convert ]; then
  cat "$4"
  exit 0
fi
command=
cast=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --command) command=$2; shift 2 ;;
    --*) shift ;;
    record) shift ;;
    *) cast=$1; shift ;;
  esac
done
/bin/bash -c "$command" >"$cast" 2>&1
exit $?
""",
        )
        self._tool("agg", "#!/usr/bin/env bash\ncp \"$1\" \"$2\"\n")
        self._tool(
            "ffmpeg",
            """#!/usr/bin/env bash
for arg in "$@"; do output=$arg; done
printf mp4 >"$output"
""",
        )

    def run_proofcast(self, *args, with_recording_tools=True):
        if with_recording_tools:
            self._recording_tools()
        env = os.environ.copy()
        env["PATH"] = f"{self.bin}:/bin:/usr/bin"
        return subprocess.run(
            [str(PROOFCAST), *args],
            cwd=self.root,
            env=env,
            text=True,
            capture_output=True,
        )

    def test_reports_every_missing_binary_before_recording(self):
        result = self.run_proofcast(
            "--", "printf", "hello", with_recording_tools=False
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("missing required binaries: asciinema agg ffmpeg", result.stderr)

    def test_records_command_to_requested_mp4(self):
        output = self.root / "proof.mp4"
        result = self.run_proofcast(
            "--out", str(output), "--", "printf", "proofcast ok"
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(output.is_file())
        self.assertIn("proofcast ok", result.stdout)
        self.assertEqual(result.stdout.splitlines()[-1], str(output))

    def test_failed_command_still_produces_video_and_returns_status(self):
        output = self.root / "failure.mp4"
        result = self.run_proofcast(
            "--out",
            str(output),
            "--",
            "python3",
            "-c",
            "print('failed'); raise SystemExit(7)",
        )

        self.assertEqual(result.returncode, 7, result.stderr)
        self.assertTrue(output.is_file())
        self.assertIn("failed", result.stdout)

    def test_skill_invokes_bundled_script_and_requires_explicit_recording(self):
        skill = SKILL.read_text()

        self.assertIn("only when the user explicitly asks", skill)
        self.assertIn('${CLAUDE_SKILL_DIR}/scripts/proofcast', skill)
        self.assertIn("Never include or print passwords", skill)
        self.assertIn("clickable link to the MP4", skill)


if __name__ == "__main__":
    unittest.main()
