"""Pattern-based secret scanner for the Nexus AI source tree.

Finding values are never returned. Each finding includes a relative path,
secret type, occurrence count, and line numbers to make review actionable.
"""

import os
import re
from pathlib import Path

SECRET_PATTERNS = {
    "AWS Access Key": re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    "AWS Secret Key": re.compile(r"(?i)\baws_secret_access_key\b\s*[:=]\s*['\"]?[A-Za-z0-9/+=]{40}"),
    "Generic API Key": re.compile(r"(?i)\b(?:api[_-]?key|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['\"]?[A-Za-z0-9_.\-/+=]{20,}"),
    "Generic Password": re.compile(r"(?i)\b(?:password|passwd|pwd)\b\s*[:=]\s*['\"]?[^\s'\"]{8,}"),
    "Private Key Block": re.compile(r"-----BEGIN (?:RSA|EC|OPENSSH|DSA) PRIVATE KEY-----"),
    "GitHub Token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "GitLab Token": re.compile(r"\bglpat-[A-Za-z0-9_-]{20,}\b"),
    "Slack Token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
}

IGNORE_DIRS = {
    ".git", ".venv", "venv", "env", "__pycache__", "node_modules",
    "dist", "build", "coverage", ".next", ".turbo", ".pytest_cache",
    ".mypy_cache", ".idea", ".vscode",
}
SCAN_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".yaml", ".yml",
    ".toml", ".ini", ".cfg", ".conf", ".properties", ".sh", ".ps1",
    ".bat", ".txt", ".env",
}
SKIP_FILENAMES = {
    ".env.example", ".env.sample", "package-lock.json", "pnpm-lock.yaml",
    "yarn.lock", "bun.lockb",
}
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024


def _is_candidate(path: Path) -> bool:
    name = path.name.lower()
    if name in SKIP_FILENAMES:
        return False
    if name == ".env" or name.startswith(".env."):
        return name not in {".env.example", ".env.sample"}
    return path.suffix.lower() in SCAN_EXTENSIONS


def scan_file(filepath: str, root: Path | None = None) -> list[dict]:
    path = Path(filepath)
    try:
        if path.stat().st_size > MAX_FILE_SIZE_BYTES:
            return []
        content = path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeError):
        return []

    relative = str(path.relative_to(root)) if root else path.name
    findings: list[dict] = []
    for secret_type, pattern in SECRET_PATTERNS.items():
        matches = list(pattern.finditer(content))
        if not matches:
            continue
        line_numbers = sorted({content.count("\n", 0, match.start()) + 1 for match in matches})
        findings.append({
            "file": relative.replace("\\", "/"),
            "type": secret_type,
            "occurrences": len(matches),
            "line_numbers": line_numbers,
        })
    return findings


def scan_directory(root_path: str) -> dict:
    root = Path(root_path).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        return {
            "scanned_root": str(root), "total_findings": 0, "files_scanned": 0,
            "findings": [], "error": "Scan directory does not exist or is not a directory.",
        }

    all_findings: list[dict] = []
    files_scanned = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in IGNORE_DIRS and not name.startswith("frontend-backup-")]
        for filename in filenames:
            candidate = Path(dirpath) / filename
            if not _is_candidate(candidate):
                continue
            try:
                if candidate.stat().st_size > MAX_FILE_SIZE_BYTES:
                    continue
            except OSError:
                continue
            files_scanned += 1
            all_findings.extend(scan_file(str(candidate), root))

    all_findings.sort(key=lambda item: (item["file"], item["line_numbers"][0] if item["line_numbers"] else 0, item["type"]))
    return {
        "scanned_root": str(root),
        "files_scanned": files_scanned,
        "total_findings": len(all_findings),
        "findings": all_findings,
    }
