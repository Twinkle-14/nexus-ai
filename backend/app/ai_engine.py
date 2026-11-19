"""Concise, evidence-grounded local Ollama analysis for Nexus AI incidents."""

import os
from pathlib import Path

import ollama
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3").strip() or "llama3"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").strip() or "http://127.0.0.1:11434"
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "30m").strip() or "30m"


def analyze_incident(
    description: str,
    error_rate_before: str,
    error_rate_after: str,
    latency_before: str,
    latency_after: str,
    notes: str = "",
) -> dict:
    """Produce a short report using only incident description and collected telemetry."""
    prompt = f"""You are a senior Site Reliability Engineer. Produce a direct, concise incident report.
Use only facts below. Do not invent causes, logs, metrics, timings, or historical changes.
Prometheus `up` counts scrape targets, NOT Kubernetes pods. Only `deployment_pods` are app pod counts.
A cumulative restart total does not prove all restarts came from this incident. Explicitly say when data is unavailable.

APPLICATION INCIDENT: {description}
Error-rate measurements: {error_rate_before} -> {error_rate_after}
Latency measurements: {latency_before} -> {latency_after}
COLLECTED PROMETHEUS EVIDENCE: {notes}

Return exactly four plain-text sections, with no introduction or conclusion.
Do not use Markdown bold markers (**), underscores, backticks, or heading symbols:
ROOT CAUSE HYPOTHESIS: one or two evidence-based sentences; call it a hypothesis if not proven.
CONFIDENCE: Low, Medium, or High, plus one short reason.
EVIDENCE: up to three short factual bullets; distinguish app pods from scrape targets.
RECOMMENDED ACTION: one safe, concrete next step.
Keep the full report under 115 words."""

    client = ollama.Client(host=OLLAMA_HOST, timeout=90)
    response = client.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        keep_alive=OLLAMA_KEEP_ALIVE,
        options={
            "temperature": 0.1,
            "num_predict": 145,
            "num_ctx": 3072,
        },
    )
    content = response.get("message", {}).get("content", "").strip()
    if not content:
        raise RuntimeError("The configured Ollama model returned an empty response.")
    return {"ai_response": content, "model": OLLAMA_MODEL}
