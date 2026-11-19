# Nexus AI — Features 3, 4 and 5 Update

This is a replacement-file update for the existing Nexus AI project. It contains the full frontend `App.tsx` and API client plus the backend modules needed by Cost Intelligence, AI Root Cause, and Secret Scanner.

## 1. Apply the files

Extract the ZIP and copy its folders into your existing project root:

`C:\Users\Twinkle\Desktop\Nexus AI`

Allow replacement of matching source files. The files in this ZIP are arranged at their exact destination paths.

**Keep your existing files and credentials:**
- Keep `backend/.env` (do not replace it with the example file).
- Keep `.git`, `backend/venv`, `frontend/node_modules`, your database and all credential files.
- Never share or commit `backend/.env`.

The included full `frontend/src/App.tsx` also preserves the current two-record Failover UI: only `my-web-app · Mumbai` and `my-web-app · Virginia` are shown on that page. The old `payments-api` record is not deleted from the database.

## 2. Backend settings

Open your existing `backend/.env` and preserve all current values, especially `DATABASE_URL` and AWS credentials. Add or update these settings:

```env
# Cost Intelligence: actual AWS Cost Explorer bill + regional EC2/EBS inventory
AWS_DEFAULT_REGION=ap-south-1
AWS_SCAN_REGIONS=ap-south-1,us-east-1
AWS_COST_CACHE_TTL_SECONDS=900

# Local AI Root Cause
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3

# Prometheus metrics used by AI Root Cause
PROMETHEUS_URL=http://127.0.0.1:9090
```

If using an AWS named profile rather than the existing environment variables, set `AWS_PROFILE=default` (or your actual profile name). Do not add literal sample credentials to the file.

The ZIP includes `backend/.env.features-3-4-5.example` as a reference only. Do not rename it over your real `.env`.

## 3. AWS Cost Intelligence permissions

The backend uses the AWS credentials already available to boto3. The IAM identity needs these read-only actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes"
      ],
      "Resource": "*"
    }
  ]
}
```

Also enable Cost Explorer once in the AWS Billing and Cost Management console: open Cost Explorer and choose **Launch Cost Explorer** if prompted. AWS prepares current-month and historical cost data after activation. The current month's data may take about 24 hours to appear, and historical data can take longer. Cost Explorer cannot be enabled via the API.

**Cost note:** AWS Cost Explorer API calls are chargeable (the standard primary billing view is currently priced at USD $0.01 per request). The backend caches the response for 15 minutes. Avoid repeatedly pressing Refresh during testing. The amount shown is AWS's `UnblendedCost` in the billing currency returned by AWS; it is not converted to INR. Cost Explorer data can lag usage.

### What Feature 3 does

- Loads actual AWS spend automatically when Cost Intelligence opens.
- Shows current-month and previous-month totals.
- Shows the last six monthly totals and current-month service breakdown.
- Separately scans running EC2 instances and unattached EBS volumes in Mumbai (`ap-south-1`) and Virginia (`us-east-1`).
- Keeps manually entered INR cost records in a separate section so they are not confused with actual AWS billing.

API endpoints:
- `GET /aws-costs` (cached for 15 minutes)
- `GET /aws-costs?force_refresh=true` (force refresh)
- `GET /aws-scan` (read-only EC2/EBS inventory)

## 4. AI Root Cause requirements

AI Root Cause requires:

1. Ollama running and the model installed:

   ```bash
   ollama list
   ollama pull llama3
   ```

   If Ollama is not already running, start it in its own terminal with `ollama serve`.

2. Prometheus reachable from the WSL backend at `http://127.0.0.1:9090`.

   Check whether Prometheus already exists:

   ```bash
   kubectl get pods -A | grep -i prometheus
   kubectl get svc -A | grep -i prometheus
   ```

   If it is missing, follow `infra/observability/PROMETHEUS-SETUP.md`. Keep the Prometheus port-forward running in its own terminal.

3. Use Chaos Lab to kill one `demo-web-app` pod. The backend records an incident automatically. Open **AI Root Cause**, select the newest incident (it is auto-selected when the page loads), then click **Investigate selected incident**.

The page lists only incidents attached to `demo-web-app`; the old Payment API 500-error demo is hidden from this feature. Click an incident row to run the investigation immediately. The generated report appears directly below the queue in the same full-width panel (there is no separate right-hand results pane). The prompt is shorter, caps the answer at 190 generated tokens, keeps the Llama model loaded for 30 minutes after its first request, and explicitly distinguishes Kubernetes pod counts from Prometheus scrape-target counts. The first investigation after starting Ollama can still take longer while the local model loads; later requests should be faster while it remains loaded. If Prometheus is unavailable, telemetry is marked unavailable rather than fabricated.

The old Payment API test incident is filtered from the AI Root Cause interface; this update does not delete historical database rows.

## 5. Secret Scanner

Open **Secret Scanner** and click **Scan project for secrets**. It scans eligible source/config files under the Nexus AI project root, including `.env` files, while excluding `.git`, virtual environments, `node_modules`, build outputs and common lockfiles.

Findings include:
- Secret type
- Relative file path
- Line number(s)
- Occurrence count

**Secret values are never included in the scanner response.** Pattern-based scanning can produce false positives and cannot guarantee discovery of every credential format. Rotate any real credential exposed in a finding.

Optional safe test with a fake key (run from the project root):

```bash
printf 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n' > secret-scan-test.txt
```

Click Scan; expected finding: `AWS Access Key`, `secret-scan-test.txt`, line 1. Remove the test file afterwards:

```bash
rm secret-scan-test.txt
```

## 6. Install dependencies and restart

Open Ubuntu/WSL terminal 1:

```bash
cd "/mnt/c/Users/Twinkle/Desktop/Nexus AI/backend"
source venv/bin/activate
pip install -r requirements.txt
python -m compileall -q main.py app routes
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open Ubuntu/WSL terminal 2:

```bash
cd "/mnt/c/Users/Twinkle/Desktop/Nexus AI/frontend"
npm run build
npm run dev
```

Open `http://localhost:5173`.

The backend should run directly in WSL as the Ubuntu user that can access Minikube kubeconfig. Do not move it into Docker for the Chaos Lab demo unless kubeconfig is explicitly mounted and configured.

## 7. Test checklist before deployment

1. **Cost Intelligence:** page automatically requests actual AWS costs; check current/previous month and six-month trend. Run the EC2/EBS inventory scan and confirm both regions are listed.
2. **AI Root Cause:** create one Chaos Lab incident, select it, investigate, and confirm both analysis text and metrics snapshot appear.
3. **Secret Scanner:** run the project scan, then use the fake-key test above and verify path/line are shown while the key itself is never displayed.
4. Run `npm run build` and `python -m compileall -q main.py app routes` before deployment.

## Boundaries to preserve in the demo

- Cost Explorer returns billing-account cost data; it does not infer savings from EC2/EBS inventory.
- The EC2/EBS scanner is read-only and does not create, stop, resize or delete resources.
- AI Root Cause provides evidence-aware hypotheses, not a guaranteed diagnosis. Prometheus and Ollama must be running for the intended full demo.
- Secret Scanner is pattern-based; it is not a guarantee that every possible secret will be found.
- Login remains a demo frontend flow, not production authentication.
