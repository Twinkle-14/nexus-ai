# Prometheus for Nexus AI Root Cause Analysis

The backend reads Kubernetes pod counts, container restart totals, and Prometheus target health from `PROMETHEUS_URL`. This is read-only.

## Check whether Prometheus already exists

```bash
kubectl get pods -A | grep -i prometheus
kubectl get svc -A | grep -i prometheus
```

If your existing Minikube cluster already has Prometheus, skip installation and port-forward its Prometheus service on port 9090.

## Install a local monitoring stack only if it is missing

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install nexus-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

Wait for the pods:

```bash
kubectl get pods -n monitoring -w
```

When Prometheus is Ready, open a separate WSL terminal and leave this running:

```bash
kubectl port-forward -n monitoring svc/nexus-monitoring-kube-prometheus-prometheus 9090:9090
```

Set this in `backend/.env`:

```env
PROMETHEUS_URL=http://127.0.0.1:9090
```

Check from another WSL terminal:

```bash
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up'
```

If Helm chooses a different Service name, find it with `kubectl get svc -n monitoring` and use that service in the port-forward command.
