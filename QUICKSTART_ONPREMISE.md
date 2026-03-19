# On-Premise Quick Start Guide

Get Hivemind Engine running in your infrastructure in 5 minutes.

## Prerequisites

✅ Docker & Docker Compose installed
✅ Claude API key ([Get one here](https://console.anthropic.com))
✅ Hivemind license key ([Contact sales](mailto:sales@hivemind.com))

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/hivemind-ai/hivemind-engine.git
cd hivemind-engine
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your keys
nano .env
```

**Required variables:**

```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
HIVEMIND_LICENSE_KEY=HIVE-1-XXXXXXXX-UNLIMITED
```

### 3. Start Hivemind

**Option A: SQLite (Simplest)**

```bash
docker-compose up -d app
```

**Option B: PostgreSQL (Recommended for Production)**

```bash
# Also set in .env:
# POSTGRES_PASSWORD=your-secure-password
# DB_URL=postgresql://hivemind:PASSWORD@postgres:5432/hivemind

docker-compose up -d
```

### 4. Verify Installation

```bash
# Check services are running
docker-compose ps

# Test health endpoint
curl http://localhost:3100/api/health

# Expected response:
# {"status":"ok","version":"0.1.0"}
```

### 5. Access Dashboard

Open your browser: **http://localhost:3100**

## First Steps

### Create Your First Company

1. Click "Create Company"
2. Enter company name: "Acme Corp"
3. Set goal: "Build a SaaS landing page with signup flow"
4. Click "Create"

### Monitor Agents

1. Navigate to the company dashboard
2. Watch as agents spawn and start working
3. View real-time logs in the "Activity" tab

### Interact with Agents

1. Click on any task
2. Add a comment: "Make the landing page mobile-responsive"
3. Agents will see and respond to your feedback

## Production Deployment

For production use, see the comprehensive guides:

- **Docker Compose**: [docs/ON_PREMISE.md](docs/ON_PREMISE.md#docker-compose)
- **Kubernetes**: [k8s/README.md](k8s/README.md)

### Recommended Production Setup

```bash
# 1. Use PostgreSQL for reliability
docker-compose up -d postgres app

# 2. Set up backups
./scripts/backup.sh

# 3. Configure reverse proxy (nginx/traefik)
# See docs/ON_PREMISE.md#tlsssl

# 4. Enable monitoring
# See docs/ON_PREMISE.md#monitoring--maintenance
```

## Common Issues

### License Error

```bash
# Validate your license
node src/license.js validate YOUR-LICENSE-KEY

# Check it's set correctly
echo $HIVEMIND_LICENSE_KEY
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "8080:3100"  # Use port 8080 instead
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify connection string
docker-compose exec app printenv DB_URL
```

### Agent Won't Start

```bash
# Check Claude API key
docker-compose logs app | grep -i "claude\|anthropic"

# Verify API key is valid
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
```

## Upgrading

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart with new version
docker-compose down
docker-compose up -d
```

## Uninstall

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker rmi hivemind-engine:latest
```

## Getting Help

- 📚 **Documentation**: [docs/ON_PREMISE.md](docs/ON_PREMISE.md)
- 💬 **Support**: support@hivemind.com
- 🐛 **Bug Reports**: https://github.com/hivemind-ai/hivemind-engine/issues
- 💼 **Sales**: sales@hivemind.com

## Next Steps

- ✅ [Configure advanced settings](docs/ON_PREMISE.md#configuration)
- ✅ [Set up monitoring](docs/ON_PREMISE.md#monitoring--maintenance)
- ✅ [Deploy to Kubernetes](k8s/README.md)
- ✅ [Enable TLS/SSL](docs/ON_PREMISE.md#tlsssl)
- ✅ [Schedule backups](docs/ON_PREMISE.md#backup-strategy)

---

**Need a license?** Contact sales@hivemind.com
**Trial available:** 30-day free trial for evaluation
