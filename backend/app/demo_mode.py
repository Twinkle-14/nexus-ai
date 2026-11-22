"""Online demo switch: features that need local infrastructure are disabled when DEMO_MODE is on."""

import os

from fastapi import HTTPException


def is_demo_mode() -> bool:
    return os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}


def block_in_demo(feature: str, reason: str) -> None:
    if is_demo_mode():
        raise HTTPException(status_code=503, detail=f"{feature} is switched off in this online demo: {reason}")


def require_local_cluster(feature: str) -> None:
    block_in_demo(
        feature,
        "it needs the local Kubernetes cluster and Ollama. Run Nexus AI locally to try it, or watch the recorded demo in the README.",
    )
