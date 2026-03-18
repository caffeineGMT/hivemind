import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';

interface Deployment {
  id: number;
  commit_sha: string;
  git_tag: string;
  deployment_url: string | null;
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled_back';
  health_check_passed: number;
  health_check_error: string | null;
  deployed_at: string;
  rolled_back_at: string | null;
  rollback_reason: string | null;
}

interface DeploymentStatusProps {
  companyId: string;
}

export function DeploymentStatus({ companyId }: DeploymentStatusProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling Back, setRollingBack] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [companyId]);

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/deployments`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackReason.trim()) {
      alert('Please provide a reason for rollback');
      return;
    }

    setRollingBack(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rollbackReason }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Rollback successful! Deployment URL: ${data.deploymentUrl}`);
        setShowRollbackDialog(false);
        setRollbackReason('');
        fetchDeployments();
      } else {
        const error = await res.json();
        alert(`Rollback failed: ${error.error}`);
      }
    } catch (err) {
      alert(`Rollback failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRollingBack(false);
    }
  };

  const getStatusIcon = (deployment: Deployment) => {
    switch (deployment.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'deploying':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'rolled_back':
        return <RotateCcw className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (deployment: Deployment) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (deployment.status) {
      case 'success':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Success</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Failed</span>;
      case 'deploying':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Deploying...</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'rolled_back':
        return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>Rolled Back</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const latestDeployment = deployments[0];
  const canRollback = latestDeployment && (latestDeployment.status === 'failed' || latestDeployment.status === 'success');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Deployment Status</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Deployment Status</h2>
        {canRollback && (
          <button
            onClick={() => setShowRollbackDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Rollback
          </button>
        )}
      </div>

      {deployments.length === 0 ? (
        <p className="text-gray-500">No deployments yet</p>
      ) : (
        <div className="space-y-3">
          {deployments.map((deployment) => (
            <div
              key={deployment.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(deployment)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{deployment.git_tag}</span>
                      {getStatusBadge(deployment)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Commit: <span className="font-mono">{deployment.commit_sha.slice(0, 8)}</span></div>
                      {deployment.deployment_url && (
                        <div>
                          URL: <a
                            href={deployment.deployment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {deployment.deployment_url}
                          </a>
                        </div>
                      )}
                      <div>Deployed: {new Date(deployment.deployed_at).toLocaleString()}</div>
                      {deployment.health_check_passed === 1 && (
                        <div className="text-green-600">✓ Health check passed</div>
                      )}
                      {deployment.health_check_error && (
                        <div className="text-red-600">✗ Health check failed: {deployment.health_check_error}</div>
                      )}
                      {deployment.rolled_back_at && (
                        <div className="text-orange-600">
                          Rolled back at {new Date(deployment.rolled_back_at).toLocaleString()}
                          {deployment.rollback_reason && ` — ${deployment.rollback_reason}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRollbackDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Rollback</h3>
            <p className="text-gray-600 mb-4">
              This will rollback to the last successful deployment. The current deployment will be reverted.
            </p>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Reason for rollback:</span>
              <textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Critical bug in production, health check failing"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRollbackDialog(false);
                  setRollbackReason('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={rollingBack}
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={rollingBack || !rollbackReason.trim()}
              >
                {rollingBack ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
