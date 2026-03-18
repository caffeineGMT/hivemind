import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Building2, Trash2, Edit2, Play, CheckCircle2, Calendar, ExternalLink } from 'lucide-react';
import { api, Company } from '../api';

export default function Companies() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; goal: string }) => api.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      api.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditingCompany(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', goal: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.goal.trim()) return;

    if (editingCompany) {
      updateMutation.mutate({
        id: editingCompany.id,
        data: { name: formData.name, goal: formData.goal },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      goal: company.goal,
    });
    setShowCreateModal(true);
  };

  const handleDelete = (company: Company) => {
    if (confirm(`Delete "${company.name}"? This will remove all agents, tasks, and data for this company. This action cannot be undone.`)) {
      deleteMutation.mutate(company.id);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingCompany(null);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Companies</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your AI companies and projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-600/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500"
        >
          <Plus className="h-4 w-4" />
          New Company
        </button>
      </div>

      {/* Company Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies?.map((company) => (
          <div
            key={company.id}
            className="group rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 transition hover:border-zinc-700 hover:bg-zinc-900/70"
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">{company.name}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                        company.status === 'running'
                          ? 'bg-emerald-950/50 text-emerald-400'
                          : company.status === 'error'
                          ? 'bg-red-950/50 text-red-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {company.status === 'running' && <Play className="h-3 w-3" />}
                      {company.status === 'active' && <CheckCircle2 className="h-3 w-3" />}
                      {company.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => handleEdit(company)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                  title="Edit company"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(company)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-950/50 hover:text-red-400"
                  title="Delete company"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Goal */}
            <p className="mb-3 line-clamp-2 text-sm text-zinc-400">
              {company.goal}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(company.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Deployment URL */}
            {company.deployment_url && (
              <a
                href={company.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400"
              >
                <ExternalLink className="h-3 w-3" />
                Live deployment
              </a>
            )}
          </div>
        ))}
      </div>

      {companies?.length === 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-zinc-700" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-300">No companies yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first AI company to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" />
            Create Company
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">
              {editingCompany ? 'Edit Company' : 'Create New Company'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme AI Solutions"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Goal / Mission
                </label>
                <textarea
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="e.g., Build and deploy a profitable SaaS product that generates $1M ARR"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20"
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 rounded-lg bg-amber-600/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingCompany
                    ? 'Update'
                    : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
