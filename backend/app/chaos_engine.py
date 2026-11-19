"""Chaos Mesh integration for the isolated Nexus demo workload."""

import os
import re
from datetime import datetime, timezone
from secrets import token_hex

from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.config.config_exception import ConfigException

CHAOS_GROUP = "chaos-mesh.org"
CHAOS_VERSION = "v1alpha1"
DEMO_NAMESPACE = "default"
DEMO_DEPLOYMENT = "demo-web-app"


def _load_cluster_config() -> None:
    """Prefer in-cluster credentials, then fall back to the current kubeconfig."""
    try:
        config.load_incluster_config()
        return
    except ConfigException:
        pass
    try:
        config.load_kube_config()
    except ConfigException as exc:
        raise RuntimeError(
            "Kubernetes is not configured for the Nexus backend. Start Minikube and ensure this WSL user can access kubeconfig."
        ) from exc


def run_pod_kill(target_deployment: str = DEMO_DEPLOYMENT, target_namespace: str = DEMO_NAMESPACE) -> dict:
    """Create a one-pod PodChaos experiment restricted to demo-web-app."""
    enabled = os.getenv("CHAOS_ENABLED", "false").strip().lower() in {"1", "true", "yes"}
    if not enabled:
        raise RuntimeError(
            "Chaos experiments are disabled. Add CHAOS_ENABLED=true to backend/.env and restart the backend."
        )
    if target_deployment != DEMO_DEPLOYMENT or target_namespace != DEMO_NAMESPACE:
        raise ValueError("Chaos Lab is restricted to demo-web-app in the default namespace.")
    chaos_namespace = os.getenv("CHAOS_EXPERIMENT_NAMESPACE", "chaos-mesh").strip()
    if not re.fullmatch(r"[a-z0-9]([a-z0-9.-]{0,61}[a-z0-9])?", chaos_namespace):
        raise RuntimeError("CHAOS_EXPERIMENT_NAMESPACE must be a valid Kubernetes namespace.")

    _load_cluster_config()
    api = client.CustomObjectsApi()
    suffix = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + token_hex(2)
    experiment_name = f"nexus-demo-pod-kill-{suffix}"[:63].rstrip("-")
    body = {
        "apiVersion": f"{CHAOS_GROUP}/{CHAOS_VERSION}",
        "kind": "PodChaos",
        "metadata": {"name": experiment_name, "namespace": chaos_namespace},
        "spec": {
            "action": "pod-kill",
            "mode": "one",
            "gracePeriod": 0,
            "selector": {
                "namespaces": [DEMO_NAMESPACE],
                "labelSelectors": {"app": DEMO_DEPLOYMENT},
            },
        },
    }
    created = api.create_namespaced_custom_object(
        group=CHAOS_GROUP,
        version=CHAOS_VERSION,
        namespace=chaos_namespace,
        plural="podchaos",
        body=body,
    )
    return {
        "experiment_name": experiment_name,
        "experiment_namespace": chaos_namespace,
        "target_deployment": DEMO_DEPLOYMENT,
        "target_namespace": DEMO_NAMESPACE,
        "selector": "app=demo-web-app",
        "mode": "one",
        "action": "pod-kill",
        "status": "created",
        "created_at": created.get("metadata", {}).get("creationTimestamp"),
    }


def get_demo_web_app_status() -> dict:
    """Return live Deployment and pod state for the Chaos Lab UI."""
    _load_cluster_config()
    apps = client.AppsV1Api()
    core = client.CoreV1Api()
    custom = client.CustomObjectsApi()
    apiextensions = client.ApiextensionsV1Api()

    deployment_exists = True
    deployment_data = {
        "name": DEMO_DEPLOYMENT,
        "namespace": DEMO_NAMESPACE,
        "replicas": 0,
        "ready_replicas": 0,
        "available_replicas": 0,
        "updated_replicas": 0,
    }
    try:
        deployment = apps.read_namespaced_deployment(DEMO_DEPLOYMENT, DEMO_NAMESPACE)
        spec = deployment.spec
        status = deployment.status
        deployment_data.update({
            "replicas": int(spec.replicas or 0),
            "ready_replicas": int(status.ready_replicas or 0),
            "available_replicas": int(status.available_replicas or 0),
            "updated_replicas": int(status.updated_replicas or 0),
        })
    except ApiException as exc:
        if exc.status == 404:
            deployment_exists = False
        else:
            raise

    pod_list = core.list_namespaced_pod(
        namespace=DEMO_NAMESPACE,
        label_selector=f"app={DEMO_DEPLOYMENT}",
    )
    pods = []
    for pod in pod_list.items:
        container_statuses = pod.status.container_statuses or []
        ready_count = sum(1 for item in container_statuses if item.ready)
        total_count = len(container_statuses)
        deleting = pod.metadata.deletion_timestamp is not None
        pods.append({
            "name": pod.metadata.name,
            "phase": pod.status.phase or "Unknown",
            "ready": bool(total_count > 0 and ready_count == total_count and not deleting),
            "ready_containers": ready_count,
            "total_containers": total_count,
            "restarts": sum(int(item.restart_count or 0) for item in container_statuses),
            "ip": pod.status.pod_ip,
            "node": pod.spec.node_name,
            "deleting": deleting,
        })
    pods.sort(key=lambda item: (item["deleting"], item["name"]))

    try:
        apiextensions.read_custom_resource_definition("podchaos.chaos-mesh.org")
        chaos_mesh_installed = True
    except ApiException as exc:
        if exc.status == 404:
            chaos_mesh_installed = False
        else:
            raise

    return {
        "target": DEMO_DEPLOYMENT,
        "namespace": DEMO_NAMESPACE,
        "deployment_exists": deployment_exists,
        "deployment": deployment_data,
        "pods": pods,
        "chaos_mesh_installed": chaos_mesh_installed,
    }
