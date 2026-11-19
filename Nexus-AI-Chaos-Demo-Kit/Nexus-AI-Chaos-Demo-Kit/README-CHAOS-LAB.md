# Nexus AI — Feature 1: Chaos Lab demo kit

This folder creates the **separate target application** that Nexus AI attacks. The target is `demo-web-app`; it is not part of the Nexus frontend or backend. It runs as a Kubernetes Deployment with two replicas so Kubernetes can replace a killed pod.

## Safety

Use only a disposable local Minikube cluster. The Chaos Lab action terminates one selected pod. Do not enable chaos against production or a shared cluster. `CHAOS_ENABLED=true` is an explicit local opt-in.

## A. Start/check Minikube (Ubuntu / WSL terminal)

From the project root or any folder:

```bash
minikube status
```

If Minikube is stopped or does not exist, start it (Docker Desktop must be running):

```bash
minikube start --driver=docker --cpus=4 --memory=6144
```

Confirm the cluster context and node:

```bash
kubectl config current-context
kubectl get nodes -o wide
kubectl get node minikube -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}{"\n"}'
```

The last command reports either `containerd://...` or `docker://...`. Use the matching Chaos Mesh install command in section C.

## B. Build and deploy the separate demo app

Run these commands from the extracted `Nexus-AI-Chaos-Demo-Kit` folder. Docker Desktop must be running and integrated with WSL.

```bash
cd demo-web-app
docker build -t nexus-demo-web-app:v1 .
minikube image load nexus-demo-web-app:v1
cd ..
kubectl apply -f kubernetes/demo-web-app.yaml
kubectl rollout status deployment/demo-web-app
kubectl get pods -l app=demo-web-app -o wide
```

You must see **2/2 pods Running**. The app returns its individual pod name at `/` and `/health`.

To open the app, keep this port-forward terminal running:

```bash
kubectl port-forward service/demo-web-app 8088:80
```

Open <http://127.0.0.1:8088>. To see the JSON health response, open <http://127.0.0.1:8088/health>.

## C. Install Chaos Mesh

The backend creates a Chaos Mesh `PodChaos` custom resource. Install Chaos Mesh once in this Minikube cluster.

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
kubectl create namespace chaos-mesh --dry-run=client -o yaml | kubectl apply -f -
```

For a **containerd** Minikube node:

```bash
helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh --version 2.8.8 \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

For a **Docker** Minikube node (the runtime output in section A starts with `docker://`):

```bash
helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh --version 2.8.8
```

Wait and verify the pods:

```bash
kubectl get pods -n chaos-mesh -w
```

Wait until the controller manager and chaos-daemon pods are `Running`/`Ready`. In another terminal, verify the PodChaos CRD exists:

```bash
kubectl get crd podchaos.chaos-mesh.org
```

If Helm reports a compatibility or chart error, stop and capture the exact error rather than trying random chart versions. The official Chaos Mesh installation guide documents the runtime-specific socket settings.

## D. Enable the local chaos switch in Nexus AI

In the Nexus project, add this line to `backend/.env`:

```env
CHAOS_ENABLED=true
```

Do not overwrite the rest of `.env`. Restart the FastAPI backend after changing it. The backend must run in the same Ubuntu/WSL environment where `kubectl config current-context` works, so its Kubernetes client can read that kubeconfig.

## E. Link the demo app to Nexus AI's service registry

The current Chaos Lab UI requires a linked service record. In Nexus AI, open **Multi-Region Failover** and add a service with:

- Name: `demo-web-app`
- Region: `minikube-local`
- Status: `healthy`
- Endpoint URL: `http://127.0.0.1:8088`

If the service already exists, do not create a duplicate. Then open **Chaos Lab**, select `demo-web-app`, and set **Kubernetes deployment name** to exactly `demo-web-app`.

## F. Run and observe the failure

Open a separate WSL terminal and watch the target pods:

```bash
kubectl get pods -l app=demo-web-app -w
```

In Nexus AI → Chaos Lab, click **Run chaos experiment** once. One pod should be killed; the Deployment should create a replacement and return to two ready replicas. The exact old/new pod names will differ each run.

Verify recovery:

```bash
kubectl rollout status deployment/demo-web-app
kubectl get pods -l app=demo-web-app
curl http://127.0.0.1:8088/health
```

Expected final state: two Ready pods and the health endpoint returns `{"status": "healthy", "instance": "..."}`.

## G. Cleanup

When finished, disable chaos again in `backend/.env`:

```env
CHAOS_ENABLED=false
```

Restart the backend. To remove only the demo workload:

```bash
kubectl delete -f kubernetes/demo-web-app.yaml
```

To remove Chaos Mesh completely (only if you no longer need it):

```bash
helm uninstall chaos-mesh -n chaos-mesh
kubectl delete namespace chaos-mesh
```

## Current Nexus integration note

The current backend route `POST /chaos-experiments/run/{target_deployment}` targets namespace `default`, selects pods with label `app=<target_deployment>`, and requires a linked Nexus service record. This demo manifest deliberately uses namespace `default` and pod label `app: demo-web-app` to match that implementation.
