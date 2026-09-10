from kubernetes import client, config

# Load the kubeconfig that minikube already set up on this machine
config.load_kube_config()

# Chaos Mesh uses "Custom Resources" - special Kubernetes objects it understands
CHAOS_GROUP = "chaos-mesh.org"
CHAOS_VERSION = "v1alpha1"


def run_pod_kill(target_deployment: str, target_namespace: str = "default"):
    """
    Triggers a real Chaos Mesh experiment that kills a pod
    belonging to the given deployment.
    """
    api = client.CustomObjectsApi()

    experiment_name = f"podkill-{target_deployment}"

    body = {
        "apiVersion": f"{CHAOS_GROUP}/{CHAOS_VERSION}",
        "kind": "PodChaos",
        "metadata": {"name": experiment_name, "namespace": target_namespace},
        "spec": {
            "action": "pod-kill",
            "mode": "one",
            "selector": {
                "namespaces": [target_namespace],
                "labelSelectors": {"app": target_deployment},
            },
        },
    }

    result = api.create_namespaced_custom_object(
        group=CHAOS_GROUP,
        version=CHAOS_VERSION,
        namespace=target_namespace,
        plural="podchaos",
        body=body,
    )

    return {"experiment_name": experiment_name, "status": "triggered", "raw": result}
