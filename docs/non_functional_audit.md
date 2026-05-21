# PAU Vox Non-Functional Audit Pack

This checklist is for pre-presentation and pre-deployment verification of NFR claims.

## 1) Security
- Password hashing: `Argon2` in backend auth/security layer.
- JWT auth: enforced for protected API routes.
- HTTPS in production: set `ENFORCE_HTTPS=true` and terminate TLS at reverse proxy/load balancer.
- CORS restricted to allowed frontend origins.

## 2) Performance (Target: API under 200ms)
Run benchmark script against your running backend:

```bash
python backend/scripts/perf_check.py \
  --base-url http://127.0.0.1:8000 \
  --endpoint /health \
  --requests 500 \
  --concurrency 50 \
  --target-ms 200
```

For authenticated endpoints:

```bash
python backend/scripts/perf_check.py \
  --base-url http://127.0.0.1:8000/api/v1 \
  --endpoint /feedback \
  --requests 300 \
  --concurrency 30 \
  --target-ms 200 \
  --token "<JWT_TOKEN>"
```

Evidence to present:
- success rate
- p95 latency
- p99 latency
- throughput (req/s)

## 3) Reliability
- Health endpoint: `GET /health`.
- Auto-restart process manager on server (`systemd`/`pm2`/container restart policy).
- Database backup cadence: daily PostgreSQL backups.
- Recovery drill: verify backup restore at least once.

## 4) Scalability claim (5,000+ active users)
The codebase can support scale, but claim should be backed by load tests and infra sizing:
- DB connection pool sizing
- app workers
- cache strategy (if added)
- measured throughput under staged load

## 5) Usability
- Mobile responsive pages and role-specific dashboards.
- Clear form guidance and validation.
- Feedback lifecycle visibility for students/staff.

## 6) Deployment-level controls (Production)
- HTTPS certs and renewals
- firewall + security groups
- logging/monitoring alerts
- secret management for env vars

## 7) Current practical scoring guidance
- Functional readiness: high
- NFR evidence readiness: medium-high once performance script results and backup proof are attached.

