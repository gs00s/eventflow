# Stock Datadog Agent has no way to take arbitrary custom check config (OpenMetrics scrape
# target, TCP log source) on Cloud Run — no bind mounts, no host filesystem. Baking conf.d in
# is the only path; same image serves both docker-compose and the Cloud Run sidecar (see
# METRICS_SCRAPE_HOST in openmetrics.d/conf.yaml for the one thing that differs between them).
FROM gcr.io/datadoghq/agent:latest

COPY conf.d/openmetrics.d/conf.yaml /etc/datadog-agent/conf.d/openmetrics.d/conf.yaml
COPY conf.d/tcp_logs.d/conf.yaml /etc/datadog-agent/conf.d/tcp_logs.d/conf.yaml
