# Stock Datadog Agent has no way to take arbitrary custom check config (TCP log source, and
# later an OpenMetrics scrape target) on Cloud Run — no bind mounts, no host filesystem. Baking
# conf.d in is the only path; same image serves both docker-compose and the Cloud Run sidecar.
FROM gcr.io/datadoghq/agent:latest

COPY conf.d/tcp_logs.d/conf.yaml /etc/datadog-agent/conf.d/tcp_logs.d/conf.yaml
