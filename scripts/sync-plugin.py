#!/usr/bin/env python3
"""Copy source skills into the installable marketplace plugin."""

from pathlib import Path
import shutil


root = Path(__file__).resolve().parents[1]
source = root / "skills"
target = root / "plugins" / "proofcast" / "skills"

if target.exists():
    shutil.rmtree(target)
shutil.copytree(
    source,
    target,
    ignore=shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc"),
)
print(f"Synced skills into {target.relative_to(root)}")
