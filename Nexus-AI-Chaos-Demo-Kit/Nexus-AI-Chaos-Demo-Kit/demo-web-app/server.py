from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socket import gethostname
import json
import os

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))
INSTANCE = gethostname()

PAGE = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
  <title>Demo Web App | Nexus AI Test Target</title>
  <style>
    *{{box-sizing:border-box}} body{{margin:0;background:#08111f;color:#eaf2ff;font:16px/1.5 Inter,system-ui,sans-serif}}
    main{{max-width:920px;margin:8vh auto;padding:24px}} .tag{{display:inline-block;border:1px solid #31506d;border-radius:999px;padding:6px 12px;color:#8ed7ff;font-size:12px;letter-spacing:.12em}}
    h1{{font-size:clamp(34px,6vw,58px);line-height:1.05;margin:24px 0 12px}} p{{color:#a8bad0;max-width:650px}}
    .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:32px}}
    .card{{background:#101e30;border:1px solid #223b56;border-radius:16px;padding:20px}} .label{{color:#91a9c4;font-size:12px;text-transform:uppercase;letter-spacing:.1em}}
    .value{{font-size:20px;font-weight:700;margin-top:8px;color:#a6f0c3}} code{{color:#8ed7ff;word-break:break-all}}
    .dot{{display:inline-block;width:9px;height:9px;background:#45df91;border-radius:50%;margin-right:8px;box-shadow:0 0 14px #45df91}}
    footer{{margin-top:28px;color:#71869f;font-size:13px}}
  </style>
</head>
<body><main>
  <span class=\"tag\">NEXUS AI · CHAOS TEST TARGET</span>
  <h1>Your application.<br>Under controlled chaos.</h1>
  <p>This is a separate demo workload running inside Kubernetes. Nexus AI can inject a pod failure; Kubernetes should replace the terminated pod and keep this service available.</p>
  <section class=\"grid\">
    <div class=\"card\"><div class=\"label\">Application status</div><div class=\"value\"><span class=\"dot\"></span>Serving requests</div></div>
    <div class=\"card\"><div class=\"label\">Pod instance</div><div class=\"value\"><code>{INSTANCE}</code></div></div>
    <div class=\"card\"><div class=\"label\">Health endpoint</div><div class=\"value\"><code>/health</code></div></div>
  </section>
  <footer>Demo workload only · Namespace: default · Managed by Kubernetes Deployment</footer>
</main></body></html>"""

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body = json.dumps({"status": "healthy", "instance": INSTANCE}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
        elif self.path == "/" or self.path.startswith("/?"):
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
        else:
            body = json.dumps({"detail": "not found"}).encode()
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"[{INSTANCE}] {fmt % args}", flush=True)

if __name__ == "__main__":
    print(f"demo-web-app starting on {HOST}:{PORT}; instance={INSTANCE}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
