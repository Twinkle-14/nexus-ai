import re
import os

# Common patterns that indicate exposed secrets
SECRET_PATTERNS = {
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key": r"(?i)aws_secret_access_key\s*=\s*['\"]?[A-Za-z0-9/+=]{40}['\"]?",
    "Generic API Key": r"(?i)(api[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{20,}['\"]?",
    "Generic Password": r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"]?[^\s'\"]{6,}['\"]?",
    "Private Key Block": r"-----BEGIN (RSA|EC|OPENSSH|DSA) PRIVATE KEY-----",
    "GitHub Token": r"ghp_[A-Za-z0-9]{36}",
}

# Folders/files we should never scan (avoid noise and huge folders)
IGNORE_DIRS = {"venv", "__pycache__", ".git", "node_modules"}
SCAN_EXTENSIONS = {".py", ".env", ".json", ".yaml", ".yml", ".txt", ".env.example"}


def scan_file(filepath: str):
    findings = []
    try:
        with open(filepath, "r", errors="ignore") as f:
            content = f.read()
    except Exception:
        return findings

    for secret_type, pattern in SECRET_PATTERNS.items():
        matches = re.findall(pattern, content)
        if matches:
            findings.append({
                "file": filepath,
                "type": secret_type,
                "occurrences": len(matches),
            })

    return findings


def scan_directory(root_path: str):
    all_findings = []

    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for filename in filenames:
            if any(filename.endswith(ext) for ext in SCAN_EXTENSIONS):
                filepath = os.path.join(dirpath, filename)
                findings = scan_file(filepath)
                all_findings.extend(findings)

    return {
        "scanned_root": root_path,
        "total_findings": len(all_findings),
        "findings": all_findings,
    }
