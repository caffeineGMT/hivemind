# Hivemind Engine On-Premise Deployment Guide

Complete guide for deploying Hivemind Engine in your own infrastructure.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [License Requirements](#license-requirements)
- [Deployment Options](#deployment-options)
  - [Docker Compose](#docker-compose)
  - [Kubernetes](#kubernetes)
- [Configuration](#configuration)
- [Database Options](#database-options)
- [Security](#security)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Enterprise Support](#enterprise-support)

## Overview

Hivemind Engine supports on-premise deployment for enterprises requiring:

- **Data sovereignty**: Keep all data within your infrastructure
- **Air-gapped environments**: Deploy in secure, isolated networks
- **Custom compliance**: Meet specific regulatory requirements
- **High availability**: Deploy across multiple regions/zones
- **Integration**: Connect with internal tools and workflows

### Architecture

```
┌─────────────────────────────────────────┐
│          Load Balancer / Ingress        │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼────┐      ┌────▼────┐
    │  App 1  │      │  App 2  │  (Replicas)
    └────┬────┘      └────┬────┘
         │                │
         └────────┬───────┘
                  │
         ┌────────▼────────┐
         │   Database      │
         │ (SQLite/Postgres)│
         └──────────────────┘
```

## Prerequisites

### System Requirements

**Minimum (Development/Testing):**
- 2 CPU cores
- 4 GB RAM
- 20 GB disk space
- Docker 24.0+ or Kubernetes 1.24+

**Recommended (Production):**
- 4+ CPU cores
- 8+ GB RAM
- 100 GB SSD storage
- High-speed internet for Claude API calls
- Load balancer (for HA deployments)

### Required Credentials

1. **Claude API Key**: Get from [Anthropic Console](https://console.anthropic.com)
2. **Hivemind License Key**: Contact sales@hivemind.com

### Software Dependencies

- Docker 24.0+ and Docker Compose 2.0+
  - OR -
- Kubernetes 1.24+
- kubectl CLI tool

## License Requirements

Hivemind on-premise deployment requires a valid license key.

### License Tiers

| Tier | Agents | Companies | Support | Price |
|------|--------|-----------|---------|-------|
| **Starter** | 2 | 5 | Email | $999/mo |
| **Professional** | 5 | 20 | Priority | $2,999/mo |
| **Enterprise** | Unlimited | Unlimited | Dedicated | Custom |

### License Format

```
HIVE-{VERSION}-{CHECKSUM}-{EXPIRY}
Example: HIVE-3-A3F2B1C4-UNLIMITED
```

### Obtaining a License

1. Contact: sales@hivemind.com
2. Provide: Company name, deployment size, use case
3. Receive: License key and activation instructions
4. Validate: `node src/license.js validate YOUR-LICENSE-KEY`

### Trial License

Request a 30-day trial license for evaluation:

```bash
# Request trial
curl -X POST https://hivemind.com/api/trial \
  -H "Content-Type: application/json" \
  -d '{"email": "you@company.com", "company": "Your Company"}'
```

## Deployment Options

### Docker Compose

**Best for:** Small teams, single-server deployments, development

#### Quick Start

1. **Clone Repository**

```bash
git clone https://github.com/hivemind-ai/hivemind-engine.git
cd hivemind-engine
```

2. **Configure Environment**

Create `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...
HIVEMIND_LICENSE_KEY=HIVE-3-XXXXXXXX-UNLIMITED

# Database (optional - defaults to SQLite)
# POSTGRES_PASSWORD=secure-random-password
# DB_URL=postgresql://hivemind:PASSWORD@postgres:5432/hivemind

# Optional Configuration
HIVEMIND_MAX_AGENTS=2
HIVEMIND_HEARTBEAT_SEC=60
```

3. **Start Services**

```bash
# Start with SQLite (simple, single-server)
docker-compose up -d app

# OR start with PostgreSQL (recommended for production)
docker-compose up -d
```

4. **Verify Deployment**

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Test health
curl http://localhost:3100/api/health
```

5. **Access Dashboard**

Open browser: http://localhost:3100

#### Docker Compose Production Configuration

```yaml
version: '3.8'

services:
  app:
    image: hivemind-engine:latest
    restart: always
    environment:
      NODE_ENV: production
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      HIVEMIND_LICENSE_KEY: ${HIVEMIND_LICENSE_KEY}
      DB_URL: ${DB_URL}
    volumes:
      - ./data:/app/data
      - ./logs:/app/data/logs
    ports:
      - "3100:3100"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3100/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes

**Best for:** Large deployments, high availability, auto-scaling

See [k8s/README.md](../k8s/README.md) for complete Kubernetes deployment guide.

#### Quick Start

```bash
# 1. Build and push image
docker build -t your-registry/hivemind:v1.0 .
docker push your-registry/hivemind:v1.0

# 2. Update k8s/hivemind-secrets.yaml with your keys

# 3. Deploy
kubectl apply -f k8s/hivemind-namespace.yaml
kubectl apply -f k8s/hivemind-secrets.yaml
kubectl apply -f k8s/hivemind-configmap.yaml
kubectl apply -f k8s/hivemind-pvc.yaml
kubectl apply -f k8s/hivemind-deployment.yaml
kubectl apply -f k8s/hivemind-service.yaml

# 4. Verify
kubectl get pods -n hivemind
kubectl logs -n hivemind -l app=hivemind-engine
```

## Configuration

### Environment Variables

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `HIVEMIND_LICENSE_KEY` | On-premise license | `HIVE-3-XXX-UNLIMITED` |

#### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `HIVEMIND_HOME` | `~/.hivemind` | Data directory |
| `HIVEMIND_MAX_AGENTS` | `2` | Max concurrent agents |
| `HIVEMIND_HEARTBEAT_SEC` | `60` | Agent heartbeat interval |
| `HIVEMIND_HEALTH_CHECK_SEC` | `30` | Health check interval |
| `DB_URL` | - | PostgreSQL connection string |

### Agent Limits by License Tier

```javascript
// Automatically enforced based on license
const LIMITS = {
  starter: { maxAgents: 2, maxCompanies: 5 },
  professional: { maxAgents: 5, maxCompanies: 20 },
  enterprise: { maxAgents: Infinity, maxCompanies: Infinity }
};
```

### Custom Configuration

Create `config/production.js`:

```javascript
export default {
  server: {
    port: 3100,
    cors: {
      origins: ['https://your-domain.com']
    }
  },
  agents: {
    maxConcurrent: 5,
    heartbeatInterval: 60000,
    crashRecovery: true
  },
  database: {
    url: process.env.DB_URL,
    poolSize: 20,
    timeout: 5000
  }
};
```

## Database Options

### SQLite (Default)

**Pros:**
- Simple setup
- No additional services
- Perfect for single-server deployments
- Automatic backups via volume snapshots

**Cons:**
- Single-server only
- No horizontal scaling
- Limited to ~100K queries/sec

**Configuration:**

```bash
# Data stored in persistent volume
HIVEMIND_HOME=/app/data
```

**Backup:**

```bash
# Docker Compose
docker-compose exec app sqlite3 /app/data/hivemind.db ".backup /app/data/backup.db"

# Kubernetes
kubectl exec -n hivemind POD_NAME -- sqlite3 /app/data/hivemind.db ".backup /app/data/backup.db"
```

### PostgreSQL (Enterprise)

**Pros:**
- Multi-server support
- Horizontal scaling
- Advanced features (replication, partitioning)
- Better for >1M queries/day

**Cons:**
- More complex setup
- Additional infrastructure

**Configuration:**

1. Deploy PostgreSQL (see `k8s/postgres-deployment.yaml`)

2. Set environment variable:

```bash
DB_URL=postgresql://hivemind:PASSWORD@postgres:5432/hivemind
```

3. Restart Hivemind app

**Backup:**

```bash
# Kubernetes
kubectl exec -n hivemind postgres-pod -- pg_dump -U hivemind hivemind > backup.sql

# Docker Compose
docker-compose exec postgres pg_dump -U hivemind hivemind > backup.sql
```

## Security

### Network Security

#### Firewall Rules

```bash
# Allow only necessary traffic
- Inbound 3100 (Hivemind dashboard)
- Outbound 443 (Claude API)
- Internal 5432 (PostgreSQL - if used)
```

#### TLS/SSL

**Option 1: Reverse Proxy (Recommended)**

```nginx
server {
    listen 443 ssl http2;
    server_name hivemind.company.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option 2: Kubernetes Ingress**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hivemind-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - hivemind.company.com
    secretName: hivemind-tls
  rules:
  - host: hivemind.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hivemind-service
            port:
              number: 80
```

### Access Control

#### Environment Isolation

```bash
# Network policies (Kubernetes)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hivemind-isolation
  namespace: hivemind
spec:
  podSelector:
    matchLabels:
      app: hivemind-engine
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
  - ports:
    - protocol: TCP
      port: 443  # Claude API
EOF
```

#### Secret Management

**Docker Compose:**

```bash
# Use Docker secrets
echo "sk-ant-api03-..." | docker secret create anthropic_key -
echo "HIVE-3-..." | docker secret create license_key -
```

**Kubernetes:**

```bash
# Use sealed secrets or external secret manager
kubectl create secret generic hivemind-secrets \
  --from-literal=anthropic-api-key="sk-ant-api03-..." \
  --from-literal=license-key="HIVE-3-..." \
  -n hivemind
```

### Audit Logging

Enable structured logging:

```javascript
// config/production.js
export default {
  logging: {
    level: 'info',
    audit: true,
    destination: '/app/data/logs/audit.log'
  }
};
```

View audit logs:

```bash
# Docker
docker-compose exec app tail -f /app/data/logs/audit.log

# Kubernetes
kubectl logs -n hivemind -l app=hivemind-engine | grep audit
```

## Monitoring & Maintenance

### Health Checks

```bash
# Basic health
curl http://localhost:3100/api/health

# Detailed status
curl http://localhost:3100/api/companies
```

### Metrics

Hivemind exposes metrics at `/api/analytics/cross-project`:

```json
{
  "totals": {
    "total_companies": 5,
    "total_agents": 12,
    "total_tasks": 156,
    "total_cost_usd": 89.43
  },
  "costTrend": [...],
  "agentPerformance": [...]
}
```

### Prometheus Integration

```yaml
# prometheus-config.yml
scrape_configs:
  - job_name: 'hivemind'
    static_configs:
      - targets: ['hivemind-service:3100']
    metrics_path: '/api/analytics/cross-project'
```

### Log Aggregation

**Option 1: Fluentd**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /app/data/logs/*.log
      pos_file /tmp/hivemind.pos
      tag hivemind.*
      <parse>
        @type json
      </parse>
    </source>
```

**Option 2: Docker Logging Driver**

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
```

### Backup Strategy

#### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR=/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup SQLite database
docker cp hivemind-app:/app/data/hivemind.db $BACKUP_DIR/

# Backup logs
docker cp hivemind-app:/app/data/logs $BACKUP_DIR/

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://your-bucket/hivemind-backups/$(date +%Y%m%d)/
```

#### Disaster Recovery

```bash
# Restore from backup
docker-compose down
docker volume rm hivemind_app-data
docker volume create hivemind_app-data
docker run --rm -v hivemind_app-data:/restore -v /path/to/backup:/backup alpine \
  sh -c "cp /backup/hivemind.db /restore/"
docker-compose up -d
```

## Troubleshooting

### License Issues

**Problem:** "Invalid license key"

```bash
# Validate license
node src/license.js validate YOUR-LICENSE-KEY

# Check environment
echo $HIVEMIND_LICENSE_KEY

# View license logs
docker-compose logs app | grep license
```

**Problem:** "License expired"

Contact sales@hivemind.com for renewal.

### Database Issues

**Problem:** Database locked (SQLite)

```bash
# Check for stale locks
docker-compose exec app ls -l /app/data/*.db-*

# Restart application
docker-compose restart app
```

**Problem:** PostgreSQL connection refused

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DB_URL

# Test connectivity
docker-compose exec app psql $DB_URL -c "SELECT 1"
```

### Performance Issues

**Problem:** Slow agent responses

1. Check Claude API limits:
   - https://console.anthropic.com/settings/limits

2. Increase agent resources:

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
```

3. Scale horizontally (Kubernetes):

```bash
kubectl scale deployment hivemind-app -n hivemind --replicas=3
```

### Connection Issues

**Problem:** Cannot access dashboard

```bash
# Check if service is running
docker-compose ps
kubectl get pods -n hivemind

# Check port bindings
netstat -tulpn | grep 3100

# Check logs
docker-compose logs app
kubectl logs -n hivemind -l app=hivemind-engine
```

## Enterprise Support

### Support Tiers

| Tier | Response Time | Channels | Price |
|------|---------------|----------|-------|
| **Email** | 24-48 hours | Email | Included |
| **Priority** | 4-8 hours | Email, Chat | +$500/mo |
| **Dedicated** | 1 hour | All channels + Phone | +$2,000/mo |

### Contact

- **Sales**: sales@hivemind.com
- **Support**: support@hivemind.com
- **Documentation**: https://docs.hivemind.com
- **Status**: https://status.hivemind.com

### Professional Services

Available for:
- Custom deployment architecture
- Integration with existing systems
- Performance optimization
- Training and onboarding
- Custom feature development

Contact: professional-services@hivemind.com

## Migration from Cloud

Migrating from Hivemind Cloud to on-premise:

```bash
# 1. Export data from cloud
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.hivemind.com/export > cloud-export.json

# 2. Import to on-premise
docker-compose exec app node scripts/import.js cloud-export.json

# 3. Update integrations to point to new URL
# 4. Verify all data migrated
# 5. Cancel cloud subscription
```

## Appendix

### System Architecture

```
hivemind-engine/
├── bin/
│   └── hivemind.js          # CLI entry point
├── src/
│   ├── server.js            # Express server
│   ├── db.js                # Database layer
│   ├── orchestrator.js      # Agent orchestration
│   ├── claude.js            # Claude API client
│   ├── license.js           # License validation
│   └── config.js            # Configuration
├── ui/                      # React dashboard
├── k8s/                     # Kubernetes manifests
├── docs/                    # Documentation
├── Dockerfile              # Container image
└── docker-compose.yml      # Docker Compose config
```

### Port Reference

| Port | Service | Protocol |
|------|---------|----------|
| 3100 | Dashboard | HTTP/WebSocket |
| 5432 | PostgreSQL | TCP |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/companies` | GET | List companies |
| `/api/companies/:id/dashboard` | GET | Company dashboard |
| `/api/companies/:id/agents` | GET | List agents |
| `/api/companies/:id/tasks` | GET | List tasks |
| `/api/analytics/cross-project` | GET | Analytics |

---

**Version:** 1.0
**Last Updated:** March 2026
**License:** Enterprise
**Support:** support@hivemind.com
