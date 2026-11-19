"""Read-only, time-bounded Prometheus queries used by AI incident analysis."""

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def query_prometheus(promql_query: str):
    base_url = os.getenv("PROMETHEUS_URL", "http://127.0.0.1:9090").rstrip("/")
    try:
        response = requests.get(
            f"{base_url}/api/v1/query", params={"query": promql_query}, timeout=3
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "success":
            return {"error": payload.get("error", "Prometheus returned a non-success response")}
        return payload.get("data", {}).get("result", [])
    except Exception as exc:
        return {"error": f"Prometheus unavailable at {base_url}: {type(exc).__name__}"}


def _instant_value(result, default=None):
    if isinstance(result, dict) and "error" in result:
        return result
    if not result:
        return default
    try:
        return float(result[0]["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return default


def get_pod_restart_count(deployment_name: str = "demo-web-app"):
    result = query_prometheus(
        f'sum(kube_pod_container_status_restarts_total{{namespace="default",pod=~"{deployment_name}.*"}})'
    )
    value = _instant_value(result, 0)
    if isinstance(value, dict):
        return value
    return {"deployment": deployment_name, "total_restarts": int(value or 0)}


def get_demo_pod_counts(deployment_name: str = "demo-web-app"):
    selector = f'namespace="default",pod=~"{deployment_name}.*"'
    total = _instant_value(query_prometheus(f"count(kube_pod_info{{{selector}}})"), None)
    running = _instant_value(
        query_prometheus(f'sum(kube_pod_status_phase{{{selector},phase="Running"}})'), None
    )
    if isinstance(total, dict):
        return {"error": total["error"]}
    if isinstance(running, dict):
        return {"error": running["error"]}
    return {
        "deployment": deployment_name,
        "pods_seen": int(total or 0),
        "pods_running": int(running or 0),
    }


def get_up_targets_summary():
    result = query_prometheus("up")
    if isinstance(result, dict) and "error" in result:
        return result
    up_count = sum(1 for item in result if item.get("value", [None, "0"])[1] == "1")
    down_count = sum(1 for item in result if item.get("value", [None, "0"])[1] == "0")
    return {"up": up_count, "down": down_count, "total": up_count + down_count}


def get_real_metrics_summary(deployment_name: str = "demo-web-app"):
    """Run the three independent instant queries concurrently to reduce scan latency."""
    with ThreadPoolExecutor(max_workers=3) as pool:
        pods_future = pool.submit(get_demo_pod_counts, deployment_name)
        restarts_future = pool.submit(get_pod_restart_count, deployment_name)
        health_future = pool.submit(get_up_targets_summary)
        return {
            "deployment_pods": pods_future.result(),
            "pod_restarts": restarts_future.result(),
            "cluster_health": health_future.result(),
        }
