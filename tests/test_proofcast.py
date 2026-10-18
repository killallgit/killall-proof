import base64
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skills/proofcast/scripts"


def decode(value):
    return base64.b64decode(value).decode()


def page_data(path):
    match = re.search(
        r'<script id="data" type="application/json">(.*?)</script>',
        path.read_text(),
        re.S,
    )
    return json.loads(match[1])


class IndexTests(unittest.TestCase):
    def test_legacy_and_context_are_encoded_and_sorted(self):
        with tempfile.TemporaryDirectory(prefix="proofcast-test-") as directory:
            root = Path(directory) / "proof's <folder>"
            first = root / "z-old"
            second = root / "a-new"
            first.mkdir(parents=True)
            second.mkdir()
            old = "20260101-120000-000"
            new = "20261017-120000-000"
            cast = '{"version":2,"width":80,"height":24}\n[0.1,"o","hello"]\n'
            (first / f"{old}.cast").write_text(cast)
            (second / f"{new}.cast").write_text(cast)
            dangerous = "</script><script>alert('not executable')</script>"
            (second / f"{new}.stdout.log").write_text(f"$ {dangerous}\n")
            metadata = {
                key: base64.b64encode(value.encode()).decode()
                for key, value in {
                    "assertion": dangerous,
                    "justification": "Check unicode: café.",
                    "command": "bash -ex ./check.sh",
                }.items()
            }
            metadata["exitStatus"] = 7
            (second / f"{new}.meta.json").write_text(json.dumps(metadata))
            subprocess.run(["bash", SCRIPTS / "proofcast-index.sh", root], check=True, capture_output=True)
            data = page_data(root / "index.html")
            self.assertEqual(decode(data["rootPath"]), str(root.resolve()))
            self.assertEqual([decode(item["slug"]) for item in data["recordings"]], ["a-new", "z-old"])
            self.assertEqual(json.loads(decode(data["recordings"][0]["meta"])), metadata)
            self.assertEqual(decode(data["recordings"][0]["log"]), f"$ {dangerous}\n")
            self.assertEqual(data["recordings"][1]["meta"], "")
            self.assertNotIn(dangerous, (root / "index.html").read_text())
            self.assertNotIn('src="vendor/', (root / "index.html").read_text())
            self.assertNotIn('href="vendor/', (root / "index.html").read_text())


@unittest.skipUnless(shutil.which("asciinema"), "asciinema is required for recorder tests")
class RecorderTests(unittest.TestCase):
    def test_missing_context_is_rejected_before_execution(self):
        result = subprocess.run(
            ["bash", SCRIPTS / "proofcast.sh", "--name", "missing", "--", "true"],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("--assertion", result.stderr)

    def test_failed_command_keeps_exact_invocation_context_and_status(self):
        with tempfile.TemporaryDirectory(prefix="proofcast-record-") as directory:
            root = Path(directory)
            assertion = "An argument survives shell quoting."
            justification = "Run Python to inspect the literal argument."
            argument = "spaces 'quotes' $dollar; café"
            command = ["python3", "-c", "import sys; print(sys.argv[1]); sys.exit(7)", argument]
            result = subprocess.run(
                ["bash", SCRIPTS / "proofcast.sh", "--root", str(root), "--name", "quoted-argument",
                 "--assertion", assertion, "--justification", justification, "--", *command],
                capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 7, result.stderr)
            index = root / "index.html"
            self.assertTrue(index.exists(), result.stderr)
            recording = page_data(index)["recordings"][0]
            metadata = json.loads(decode(recording["meta"]))
            self.assertEqual(metadata["exitStatus"], 7)
            self.assertEqual(decode(metadata["assertion"]), assertion)
            self.assertEqual(decode(metadata["justification"]), justification)
            literal = decode(metadata["command"])
            quoted = subprocess.run(
                ["bash", "-c", 'printf "%q " "$@"', "test", *command],
                capture_output=True, check=True,
            )
            self.assertEqual(literal, quoted.stdout.decode().removesuffix(" "))
            log = decode(recording["log"])
            self.assertIn(f"$ {literal}", log)
            self.assertIn(argument, log)
            self.assertEqual(result.stdout.splitlines()[-1], str(index.resolve()))


if __name__ == "__main__":
    unittest.main()
