cd "/mnt/c/Users/Twinkle/Desktop/Nexus AI"
cat > README.md << 'EOF'
# Nexus AI — Break it. Watch it heal itself.

An AI-powered cloud resilience platform: break an application on purpose, watch Kubernetes recover it, fail over between regions, and get an AI-written root-cause report grounded in real metrics.

**Live demo:** https://nexus-ai-9m4d.onrender.com
*(Free hosting: the first load can take ~50 seconds while the backend wakes up.)*

<!-- Add your demo video link here, e.g. [Watch the 60-second demo](https://...) -->

## Features

| # | Feature | What it does | Where it runs |
|---|---------|--------------|---------------|
| 1 | **Chaos Lab** | Uses Chaos Mesh (PodChaos) to kill a real pod of `demo-web-app`; Kubernetes recreates it. | Local (minikube) |
| 2 | **Multi-Region Failover** | Detects an unhealthy primary, promotes the backup and records the failover time. Demo targets run in two regions (Singapore and Virginia). | Online + local |
| 3 | **Cost Intelligence** | Read-only AWS scan for idle EC2 and unattached EBS volumes, plus Cost Explorer spend. | Local |
| 4 | **AI Root Cause** | Collects Prometheus telemetry and asks Llama 3 (Ollama) for an evidence-based incident report. | Local |
| 5 | **Secret Scanner** | Scans project files for exposed AWS keys, tokens and passwords, with values redacted. | Online + local |

**Honest notes**
- Failover updates service records in the database and checks real health endpoints. It does not change live DNS or production traffic.
- The online demo has no Kubernetes cluster, no Ollama and no AWS keys, so features 1, 3 and 4 show a clear "runs locally" message there. They run for real on a local setup (see below).
- Cost Explorer is a paid AWS API (about $0.01 per request); results are cached for 15 minutes.

## Architecture

~~~
React + TypeScript (Vite, Tailwind)
            |
            v
     FastAPI backend ----> PostgreSQL (Neon online / local Postgres)
        |    |    |
        |    |    +--> boto3 (AWS read-only scans)
        |    +-------> Prometheus API --> Ollama / Llama 3 (root cause)
        +------------> Kubernetes API --> Chaos Mesh --> demo-web-app pods
~~~

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, Three.js
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic
- **Data:** PostgreSQL
- **DevOps:** Docker, Kubernetes (minikube), Helm, Prometheus, Grafana, Loki, Chaos Mesh, GitHub Actions
- **AI:** Ollama + Llama 3
- **Cloud:** AWS (boto3, read-only), Render (hosting), Neon (database)

## Run it locally

Requirements: Docker Desktop, Python 3.12, Node.js 22, minikube, kubectl, Helm, Ollama (with `llama3`).

1. **Kubernetes**
~~~
minikube start --driver=docker
kubectl get nodes
~~~
2. **Prometheus** (keep this terminal open)
~~~
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090
~~~
3. **Ollama** (skip if it already runs as a service)
~~~
ollama serve
ollama list     # should show llama3
~~~
4. **Backend**
~~~
cd backend
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # fill in DATABASE_URL (and optional AWS keys)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
~~~
5. **Frontend**
~~~
cd frontend
npm install
npm run dev
~~~
Open http://localhost:5173 (API docs at http://localhost:8000/docs).

Never commit `.env` files or AWS keys. The Secret Scanner is there to catch that.

## Project structure

~~~
backend/    FastAPI app, routes, chaos/failover/AI/AWS engines
frontend/   React dashboard
infra/      demo-web-app (Dockerfile + server), Kubernetes manifests, observability notes
.github/    GitHub Actions CI
~~~

## Deployment

- **Frontend:** Render static site
- **Backend:** Render web service (`DEMO_MODE=true` switches off the local-only features)
- **Database:** Neon PostgreSQL
- **Failover demo targets:** two copies of `infra/demo-web-app` on Render (Singapore and Virginia)

## Author

Twinkle Surti — https://github.com/Twinkle-14
EOF
