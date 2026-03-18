import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { Settings as SettingsIcon, Zap, DollarSign, Activity, Clock, Save, RotateCcw, Archive, Trash2 } from 'lucide-react';

interface ProjectConfig {
  company_id: string;
  max_concurrent_agents: number;
  heartbeat_interval_sec: number;
  checkpoint_every_n_turns: number;
  max_budget_usd: number | null;
  budget_alert_threshold: number;
  auto_resume: boolean;
  health_check_enabled: boolean;
  health_check_interval_sec: number;
  deployment_enabled: boolean;
  auto_deploy: boolean;
  slack_notifications: boolean;
  slack_webhook_url: string | null;
}

interface BudgetStatus {
  spent: number;
  limit: number | null;
  hasLimit: boolean;
  usageRatio: number;
  exceeded: boolean;
  approaching: boolean;
  remaining: number | null;
}

export default function Settings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localConfig, setLocalConfig] = useState<ProjectConfig | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['config', companyId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}/config`);
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    },
    onSuccess: (data) => {
      if (!localConfig) setLocalConfig(data.config);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<ProjectConfig>) => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save config');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', companyId] });
      setHasUnsavedChanges(false);
    },
  });

  const presetMutation = useMutation({
    mutationFn: async (preset: string) => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}/config/preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });
      if (!res.ok) throw new Error('Failed to apply preset');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['config', companyId] });
      setLocalConfig(data.config);
      setHasUnsavedChanges(false);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}/config`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to reset config');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', companyId] });
      setHasUnsavedChanges(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}/archive`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to archive project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:3100/api/companies/${companyId}?confirm=true`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      window.location.href = '/';
    },
  });

  if (isLoading || !data || !localConfig) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { config, budgetStatus, availableSlots, resources, presets } = data;
  const budget = budgetStatus as BudgetStatus;

  const updateField = (field: keyof ProjectConfig, value: any) => {
    setLocalConfig({ ...localConfig, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localConfig);
  };

  const handleReset = () => {
    setLocalConfig(config);
    setHasUnsavedChanges(false);
  };

  const handlePreset = (preset: string) => {
    presetMutation.mutate(preset);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Project Configuration</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Configure resource limits, budgets, and isolation settings
          </p>
        </div>
        {hasUnsavedChanges && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isLoading}
              className="flex items-center gap-2 rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Quick presets */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Zap className="h-4 w-4" />
          Quick Presets
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {presets.map((preset: string) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              disabled={presetMutation.isLoading}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-amber-600/50 hover:bg-zinc-800 disabled:opacity-50"
            >
              {preset.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Limits */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Activity className="h-4 w-4" />
          Resource Limits
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Max Concurrent Agents
              <span className="ml-2 text-xs text-zinc-600">
                ({availableSlots} available)
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={localConfig.max_concurrent_agents}
              onChange={(e) => updateField('max_concurrent_agents', parseInt(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Heartbeat Interval (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={localConfig.heartbeat_interval_sec}
              onChange={(e) => updateField('heartbeat_interval_sec', parseInt(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Checkpoint Every N Turns
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={localConfig.checkpoint_every_n_turns}
              onChange={(e) => updateField('checkpoint_every_n_turns', parseInt(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
            />
          </div>
        </div>
      </div>

      {/* Budget Controls */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <DollarSign className="h-4 w-4" />
          Budget Controls
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Max Budget (USD)
              {budget.hasLimit && (
                <span className="ml-2 text-xs text-zinc-600">
                  ${budget.spent.toFixed(2)} / ${budget.limit?.toFixed(2)} spent ({(budget.usageRatio * 100).toFixed(1)}%)
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localConfig.max_budget_usd || ''}
              onChange={(e) => updateField('max_budget_usd', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Budget Alert Threshold ({(localConfig.budget_alert_threshold * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.budget_alert_threshold}
              onChange={(e) => updateField('budget_alert_threshold', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {budget.exceeded && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              ⚠️ Budget limit exceeded — agent dispatch paused
            </div>
          )}
          {budget.approaching && !budget.exceeded && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-400">
              Budget approaching limit — {budget.remaining?.toFixed(2)} USD remaining
            </div>
          )}
        </div>
      </div>

      {/* Automation */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Clock className="h-4 w-4" />
          Automation
        </h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-zinc-400">Auto-resume on restart</span>
            <input
              type="checkbox"
              checked={localConfig.auto_resume}
              onChange={(e) => updateField('auto_resume', e.target.checked)}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-zinc-400">Health check monitoring</span>
            <input
              type="checkbox"
              checked={localConfig.health_check_enabled}
              onChange={(e) => updateField('health_check_enabled', e.target.checked)}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-zinc-400">Deployment enabled</span>
            <input
              type="checkbox"
              checked={localConfig.deployment_enabled}
              onChange={(e) => updateField('deployment_enabled', e.target.checked)}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-zinc-400">Auto-deploy on completion</span>
            <input
              type="checkbox"
              checked={localConfig.auto_deploy}
              onChange={(e) => updateField('auto_deploy', e.target.checked)}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
        </div>
      </div>

      {/* Project Resources */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-zinc-300">Project Resources</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-bold text-zinc-100">{resources.agents.length}</div>
            <div className="text-xs text-zinc-500">Agents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{resources.tasks.length}</div>
            <div className="text-xs text-zinc-500">Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{resources.activity}</div>
            <div className="text-xs text-zinc-500">Activity Logs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{resources.costs}</div>
            <div className="text-xs text-zinc-500">Cost Logs</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-900/50 bg-red-950/10 p-6">
        <h3 className="mb-4 text-sm font-semibold text-red-400">Danger Zone</h3>
        <div className="space-y-3">
          <button
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isLoading}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-red-600/50 hover:bg-zinc-800 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archive Project
            </span>
            <span className="text-xs text-zinc-500">Stops all agents, preserves data</span>
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-between rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </span>
              <span className="text-xs text-red-600">Permanently deletes all data</span>
            </button>
          ) : (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
              <p className="mb-3 text-sm text-red-400">
                This will permanently delete the project and ALL associated data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {deleteMutation.isLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
