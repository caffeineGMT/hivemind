# Kubernetes Deployment Guide

Complete guide for deploying Hivemind Engine on Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured to access your cluster
- Docker registry (for custom images)
- Valid Hivemind license key
- Anthropic API key

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t your-registry/hivemind-engine:latest .

# Push to your registry
docker push your-registry/hivemind-engine:latest
```

### 2. Update Configuration

Edit `k8s/hivemind-secrets.yaml`:

```yaml
stringData:
  anthropic-api-key: "sk-ant-api03-..."  # Your Claude API key
  license-key: "HIVE-1-XXXXXXXX-UNLIMITED"  # Your license key
  postgres-password: "secure-random-password"
```

Edit `k8s/hivemind-deployment.yaml`:

```yaml
containers:
- name: hivemind
  image: your-registry/hivemind-engine:latest  # Your image
```

### 3. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/hivemind-namespace.yaml

# Create secrets (edit first!)
kubectl apply -f k8s/hivemind-secrets.yaml

# Create config
kubectl apply -f k8s/hivemind-configmap.yaml

# Create persistent volumes
kubectl apply -f k8s/hivemind-pvc.yaml

# Deploy application
kubectl apply -f k8s/hivemind-deployment.yaml

# Create service
kubectl apply -f k8s/hivemind-service.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n hivemind

# Check logs
kubectl logs -n hivemind -l app=hivemind-engine --tail=100

# Check service
kubectl get svc -n hivemind
```

### 5. Access the Dashboard

**LoadBalancer (recommended for cloud):**

```bash
kubectl get svc hivemind-service -n hivemind
# Access via EXTERNAL-IP:80
```

**NodePort (for on-premise):**

```bash
kubectl get svc hivemind-nodeport -n hivemind
# Access via <node-ip>:30100
```

## PostgreSQL Deployment (Optional)

For enterprise deployments requiring PostgreSQL:

### 1. Deploy PostgreSQL

```bash
kubectl apply -f k8s/postgres-deployment.yaml
```

### 2. Enable PostgreSQL in App

Edit `k8s/hivemind-deployment.yaml` and uncomment:

```yaml
- name: DB_URL
  valueFrom:
    secretKeyRef:
      name: hivemind-secrets
      key: postgres-connection-string
```

### 3. Update Secrets

Ensure `postgres-connection-string` in secrets matches your PostgreSQL config:

```yaml
postgres-connection-string: "postgresql://hivemind:PASSWORD@hivemind-postgres:5432/hivemind"
```

## Scaling

### Horizontal Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment hivemind-app -n hivemind --replicas=3

# Or edit deployment.yaml and set replicas: 3
```

### Resource Limits

Edit `hivemind-deployment.yaml`:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Storage

### Storage Classes

Update `storageClassName` in PVC files to match your cluster:

```yaml
storageClassName: gp3  # AWS EBS
# storageClassName: standard-rwo  # GKE
# storageClassName: managed-premium  # Azure
```

### Backup Data

```bash
# Backup SQLite database
kubectl cp hivemind/<pod-name>:/app/data/hivemind.db ./backup/hivemind.db

# Backup PostgreSQL (if using)
kubectl exec -n hivemind hivemind-postgres-0 -- pg_dump -U hivemind hivemind > backup.sql
```

## Monitoring

### Health Checks

```bash
# Check liveness probe
kubectl exec -n hivemind <pod-name> -- curl http://localhost:3100/api/health

# View pod events
kubectl describe pod -n hivemind <pod-name>
```

### Logs

```bash
# Tail logs
kubectl logs -f -n hivemind -l app=hivemind-engine

# View logs from specific pod
kubectl logs -n hivemind <pod-name>

# View previous crashed container logs
kubectl logs -n hivemind <pod-name> --previous
```

### Metrics

```bash
# Pod resource usage
kubectl top pods -n hivemind

# Node resource usage
kubectl top nodes
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod -n hivemind <pod-name>

# Common issues:
# - Image pull errors: Verify registry credentials
# - Missing secrets: Check kubectl get secrets -n hivemind
# - PVC binding: Check kubectl get pvc -n hivemind
```

### License Issues

```bash
# View license validation logs
kubectl logs -n hivemind <pod-name> | grep license

# Verify secret exists
kubectl get secret hivemind-secrets -n hivemind -o yaml

# Update license
kubectl edit secret hivemind-secrets -n hivemind
```

### Database Connection

```bash
# Test database connectivity (SQLite)
kubectl exec -n hivemind <pod-name> -- ls -lh /app/data/hivemind.db

# Test PostgreSQL connectivity
kubectl exec -n hivemind hivemind-postgres-0 -- psql -U hivemind -c "SELECT 1"
```

## Security

### Network Policies

Create network policy to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hivemind-netpol
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
    ports:
    - protocol: TCP
      port: 3100
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443  # Claude API
```

### Pod Security

Edit deployment to add security context:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: hivemind
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

### Secrets Management

Use external secrets manager (recommended):

- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault
- Kubernetes External Secrets Operator

## Ingress

### NGINX Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hivemind-ingress
  namespace: hivemind
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - hivemind.yourdomain.com
    secretName: hivemind-tls
  rules:
  - host: hivemind.yourdomain.com
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

## Upgrades

### Rolling Update

```bash
# Update image version
kubectl set image deployment/hivemind-app hivemind=your-registry/hivemind-engine:v1.1.0 -n hivemind

# Watch rollout
kubectl rollout status deployment/hivemind-app -n hivemind

# Rollback if needed
kubectl rollout undo deployment/hivemind-app -n hivemind
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace hivemind

# Or delete individually
kubectl delete -f k8s/
```

## Support

For enterprise support, contact: support@hivemind.com
