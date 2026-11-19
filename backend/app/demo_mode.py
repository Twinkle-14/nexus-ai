"""Online demo switch: features that need the local cluster/Ollama are disabled when DEMO_MODE is on."""

import os

from fastapi import HTTPException


def is_demo_mode() -> bool:
    return os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}


def require_local_cluster(feature: str) -> None:
    if is_demo_mode():
        raise HTTPException(
            status_code=503,
            detail=(
                f"{feature} needs the local Kubernetes cluster and Ollama, so it is switched off "
                "in this online demo. Run Nexus AI locally to try it (see the README)."
            ),
        )
