const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type RequestOptions = RequestInit & { body?: BodyInit | null };

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(`Cannot reach Nexus API at ${BASE_URL}. Start the backend and check VITE_API_URL.`);
  }

  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try { payload = JSON.parse(raw); }
    catch { payload = raw; }
  }

  if (!response.ok) {
    const detail = payload?.detail || payload?.message || payload?.error || raw || response.statusText;
    throw new Error(`API error ${response.status}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  return payload as T;
}

const get = <T>(path: string) => apiRequest<T>(path);
const post = <T>(path: string, data?: unknown) => apiRequest<T>(path, {
  method: "POST",
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
});
const put = <T>(path: string, data: unknown) => apiRequest<T>(path, {
  method: "PUT",
  body: JSON.stringify(data),
});
const remove = <T>(path: string) => apiRequest<T>(path, { method: "DELETE" });

export type ServiceInput = {
  name: string;
  region: string;
  status?: string;
  endpoint_url?: string;
};
export type IncidentInput = {
  service_id: number;
  severity?: string;
  description: string;
  root_cause?: string | null;
  status?: string;
};
export type ChaosExperimentInput = {
  service_id: number;
  failure_type: string;
  result?: string;
  notes?: string | null;
};
export type CostReportInput = {
  resource_name: string;
  monthly_cost: number;
  recommendation?: string | null;
  potential_savings?: number | null;
};

// System status
export const getHealth = () => get<{ status: string; service?: string }>("/health");
export const getDatabaseStatus = () => get<{ database: string; dialect?: string }>("/db-check");

// Services
export const getServices = () => get<any[]>("/services/");
export const getService = (id: number) => get<any>(`/services/${id}`);
export const createService = (data: ServiceInput) => post<any>("/services/", data);
export const updateService = (id: number, data: ServiceInput) => put<any>(`/services/${id}`, data);
export const deleteService = (id: number) => remove<any>(`/services/${id}`);

// Multi-region failover
export const simulateFailure = (primaryId: number) => post<any>(`/services/failover/simulate/${primaryId}`);
export const runFailover = (primaryId: number, backupId: number) =>
  post<any>(`/services/failover/run/${primaryId}/${backupId}`);
export const recoverPrimary = (primaryId: number, backupId: number) =>
  post<any>(`/services/failover/recover/${primaryId}/${backupId}`);

// Incidents and AI root-cause investigation
export const getIncidents = () => get<any[]>("/incidents/");
export const getIncident = (id: number) => get<any>(`/incidents/${id}`);
export const createIncident = (data: IncidentInput) => post<any>("/incidents/", data);
export const updateIncident = (id: number, data: IncidentInput) => put<any>(`/incidents/${id}`, data);
export const deleteIncident = (id: number) => remove<any>(`/incidents/${id}`);
export const investigateIncident = (incidentId: number) => post<any>(`/incidents/${incidentId}/investigate`);

// Chaos experiments
export const getChaosExperiments = () => get<any[]>("/chaos-experiments/");
export const getChaosExperiment = (id: number) => get<any>(`/chaos-experiments/${id}`);
export const createChaosExperiment = (data: ChaosExperimentInput) => post<any>("/chaos-experiments/", data);
export const updateChaosExperiment = (id: number, data: ChaosExperimentInput) =>
  put<any>(`/chaos-experiments/${id}`, data);
export const deleteChaosExperiment = (id: number) => remove<any>(`/chaos-experiments/${id}`);
export const runChaosExperiment = (targetDeployment: string, serviceId?: number) =>
  post<any>(`/chaos-experiments/run/${encodeURIComponent(targetDeployment)}${serviceId ? `?service_id=${serviceId}` : ""}`);

// Cost reports and cloud scanner
export const getCostReports = () => get<any[]>("/cost-reports/");
export const getCostReport = (id: number) => get<any>(`/cost-reports/${id}`);
export const createCostReport = (data: CostReportInput) => post<any>("/cost-reports/", data);
export const updateCostReport = (id: number, data: CostReportInput) => put<any>(`/cost-reports/${id}`, data);
export const deleteCostReport = (id: number) => remove<any>(`/cost-reports/${id}`);
export const getAwsScan = () => get<any>("/aws-scan");
export const getAwsCosts = (forceRefresh = false) =>
  get<any>(`/aws-costs${forceRefresh ? "?force_refresh=true" : ""}`);

// Repository secret scanner
export const getSecretScan = () => get<any>("/secret-scan");

// Live Kubernetes state for the isolated Chaos Lab demo workload.
export const getDemoAppStatus = () => get<any>("/chaos-experiments/demo/status");


// Feature 4: create an incident, collect Prometheus evidence, and generate one report.
export const scanAndInvestigateIncident = (data: IncidentInput) =>
  post<any>("/incidents/scan-and-investigate", data);

// Remove only the known fake seed incident used in the early Payment API demo.
export const removeLegacyPaymentPlaceholder = () =>
  remove<any>("/incidents/demo-payment-placeholder");
