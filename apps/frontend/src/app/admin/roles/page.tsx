'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Compass,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
  Check,
  Tag,
  Power
} from 'lucide-react';

interface TargetRole {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  enrolledLearnersCount: number;
  skills: {
    id: string;
    name: string;
    slug: string;
    requiredLevel: number;
    importance: number;
  }[];
}

interface SkillOption {
  id: string;
  name: string;
  slug: string;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<TargetRole[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TargetRole | null>(null);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<TargetRole | null>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    selectedSkillIds: [] as string[],
    customSkillInput: '',
    customSkills: [] as string[]
  });

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/admin/roles');
      if (res?.roles) {
        setRoles(res.roles);
      }
      if (res?.availableSkills) {
        setAvailableSkills(res.availableSkills);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to load target roles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      status: 'ACTIVE',
      selectedSkillIds: [],
      customSkillInput: '',
      customSkills: []
    });
    setActionError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: TargetRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      status: role.status,
      selectedSkillIds: role.skills.map(s => s.id),
      customSkillInput: '',
      customSkills: []
    });
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleAddCustomSkill = () => {
    const val = formData.customSkillInput.trim();
    if (val && !formData.customSkills.includes(val)) {
      setFormData(prev => ({
        ...prev,
        customSkills: [...prev.customSkills, val],
        customSkillInput: ''
      }));
    }
  };

  const handleRemoveCustomSkill = (name: string) => {
    setFormData(prev => ({
      ...prev,
      customSkills: prev.customSkills.filter(s => s !== name)
    }));
  };

  const toggleExistingSkill = (skillId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSkillIds: prev.selectedSkillIds.includes(skillId)
        ? prev.selectedSkillIds.filter(id => id !== skillId)
        : [...prev.selectedSkillIds, skillId]
    }));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      setActionError('Role name and description are required.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      if (editingRole) {
        await apiClient(`/admin/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            status: formData.status,
            skillIds: formData.selectedSkillIds,
            customSkills: formData.customSkills
          })
        });
        setActionSuccess(`Target role "${formData.name.trim()}" updated successfully.`);
      } else {
        await apiClient('/admin/roles', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            status: formData.status,
            skillIds: formData.selectedSkillIds,
            customSkills: formData.customSkills
          })
        });
        setActionSuccess(`Target role "${formData.name.trim()}" published successfully. It is now visible to learners.`);
      }

      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (role: TargetRole) => {
    const nextStatus = role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient(`/admin/roles/${role.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setActionSuccess(`Role "${role.name}" marked as ${nextStatus}.`);
      fetchRoles();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteConfirmRole) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      await apiClient(`/admin/roles/${deleteConfirmRole.id}?force=${forceDelete}`, {
        method: 'DELETE'
      });
      setActionSuccess(`Target role "${deleteConfirmRole.name}" removed successfully.`);
      setDeleteConfirmRole(null);
      setForceDelete(false);
      fetchRoles();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch =
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.description.toLowerCase().includes(search.toLowerCase()) ||
      role.skills.some(s => s.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || role.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRoles = roles.length;
  const activeRoles = roles.filter(r => r.status === 'ACTIVE').length;
  const totalEnrolled = roles.reduce((acc, r) => acc + (r.enrolledLearnersCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-[#315EF7]" />
            Target Roles & Career Tracks
          </h1>
          <p className="text-sm text-[#626262] dark:text-slate-400 mt-1">
            Manage target roles and skill competencies displayed during student onboarding and roadmap generation.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-[#315EF7] hover:bg-[#274cd0] text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Target Role
        </Button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-semibold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
            Total Career Tracks
          </div>
          <div className="mt-2 text-2xl font-bold text-[#171717] dark:text-white">
            {totalRoles}
          </div>
          <p className="text-xs text-[#8E8E8E] mt-1">Configured in the curriculum catalog</p>
        </Card>

        <Card className="p-5 border border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-semibold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
            Active Onboarding Tracks
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeRoles}
          </div>
          <p className="text-xs text-[#8E8E8E] mt-1">Currently selectable by onboarding learners</p>
        </Card>

        <Card className="p-5 border border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-semibold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
            Enrolled Students
          </div>
          <div className="mt-2 text-2xl font-bold text-[#315EF7]">
            {totalEnrolled}
          </div>
          <p className="text-xs text-[#8E8E8E] mt-1">Students actively pursuing these roles</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role name or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E7E7E7] dark:border-slate-700 bg-[#FAFAFA] dark:bg-slate-800 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#315EF7]/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#626262] dark:text-slate-400 font-medium">Status:</span>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-[#315EF7] text-white'
                    : 'bg-[#F2F2F2] dark:bg-slate-800 text-[#626262] dark:text-slate-300 hover:bg-[#EAEAEA]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Roles List */}
      {isLoading ? (
        <div className="p-12 flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#315EF7] border-t-transparent animate-spin" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900">
          <Compass className="w-12 h-12 text-[#8E8E8E] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-[#171717] dark:text-white">
            {roles.length === 0 ? 'No Target Roles Created Yet' : 'No Matching Roles Found'}
          </h3>
          <p className="text-xs text-[#626262] dark:text-slate-400 mt-1 max-w-md mx-auto">
            {roles.length === 0
              ? 'Create your first target role so new learners can pick their career track during onboarding.'
              : 'Try adjusting your search or status filter to see other roles.'}
          </p>
          {roles.length === 0 && (
            <Button
              onClick={openCreateModal}
              className="mt-4 bg-[#315EF7] text-white text-xs px-4 py-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create First Role
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map(role => (
            <Card
              key={role.id}
              className={`p-5 border transition-all flex flex-col justify-between ${
                role.status === 'ACTIVE'
                  ? 'border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-base text-[#171717] dark:text-white flex items-center gap-2">
                      {role.name}
                    </h3>
                    <span className="text-[11px] font-mono text-[#8E8E8E]">/{role.slug}</span>
                  </div>
                  <Badge
                    variant={role.status === 'ACTIVE' ? 'success' : 'default'}
                    className="capitalize text-[10px]"
                  >
                    {role.status.toLowerCase()}
                  </Badge>
                </div>

                <p className="text-xs text-[#626262] dark:text-slate-300 mt-2 leading-relaxed">
                  {role.description}
                </p>

                {/* Skills tags */}
                <div className="mt-4">
                  <div className="text-[11px] font-medium text-[#8E8E8E] mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Core Competencies ({role.skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.skills.length > 0 ? (
                      role.skills.map(skill => (
                        <span
                          key={skill.id}
                          className="px-2 py-0.5 bg-[#F3F6FF] dark:bg-indigo-950/40 text-[#315EF7] dark:text-indigo-300 text-[10px] font-medium rounded-md border border-[#315EF7]/20"
                        >
                          {skill.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#8E8E8E] italic">No skills linked</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-6 pt-4 border-t border-[#F2F2F2] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#626262] dark:text-slate-400">
                  <Users className="w-3.5 h-3.5 text-[#315EF7]" />
                  <span>
                    <strong className="text-[#171717] dark:text-white">{role.enrolledLearnersCount}</strong> learners
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(role)}
                    title={role.status === 'ACTIVE' ? 'Deactivate track' : 'Activate track'}
                    className="p-1.5 text-[#626262] hover:text-[#171717] dark:hover:text-white rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-slate-800 transition-colors"
                  >
                    <Power className={`w-4 h-4 ${role.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </button>
                  <button
                    onClick={() => openEditModal(role)}
                    title="Edit Role"
                    className="p-1.5 text-[#626262] hover:text-[#315EF7] rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmRole(role);
                      setForceDelete(false);
                    }}
                    title="Delete Role"
                    className="p-1.5 text-[#626262] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E7E7E7] dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2F2F2] dark:border-slate-800">
              <h2 className="text-lg font-bold text-[#171717] dark:text-white">
                {editingRole ? 'Edit Target Role' : 'Create New Target Role'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8E8E8E] hover:text-[#171717] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Engineer, AI Systems Architect"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E7E7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#315EF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the career path, responsibilities, and key domain areas..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E7E7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#315EF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E7E7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#315EF7]"
                >
                  <option value="ACTIVE">ACTIVE (Learners can select this role during onboarding)</option>
                  <option value="INACTIVE">INACTIVE (Hidden from onboarding)</option>
                </select>
              </div>

              {/* Skills Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
                  Core Skills & Competencies
                </label>

                {availableSkills.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[11px] text-[#626262] dark:text-slate-400 block mb-1.5">
                      Select from existing catalogue:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#FAFAFA] dark:bg-slate-800/50 rounded-lg border border-[#E7E7E7] dark:border-slate-800">
                      {availableSkills.map(skill => {
                        const isSelected = formData.selectedSkillIds.includes(skill.id);
                        return (
                          <button
                            type="button"
                            key={skill.id}
                            onClick={() => toggleExistingSkill(skill.id)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#315EF7] text-white'
                                : 'bg-white dark:bg-slate-800 text-[#626262] dark:text-slate-300 border border-[#E7E7E7] dark:border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {skill.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add Custom Skills */}
                <div>
                  <span className="text-[11px] text-[#626262] dark:text-slate-400 block mb-1">
                    Add new skills (press Enter or click Add):
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems, Kubernetes, GraphQL"
                      value={formData.customSkillInput}
                      onChange={e => setFormData({ ...formData, customSkillInput: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSkill();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E7E7E7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#171717] dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomSkill}
                      className="text-xs"
                    >
                      Add
                    </Button>
                  </div>

                  {formData.customSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.customSkills.map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomSkill(skill)}
                            className="hover:text-emerald-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#F2F2F2] dark:border-slate-800 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#315EF7] hover:bg-[#274cd0] text-white"
                >
                  {isSubmitting ? 'Saving...' : editingRole ? 'Update Role' : 'Publish Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E7E7E7] dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-[#171717] dark:text-white">Delete Target Role?</h3>
            </div>
            <p className="text-xs text-[#626262] dark:text-slate-300 leading-relaxed mb-4">
              Are you sure you want to remove <strong>{deleteConfirmRole.name}</strong>?
            </p>

            {deleteConfirmRole.enrolledLearnersCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs mb-4">
                <strong>Warning:</strong> {deleteConfirmRole.enrolledLearnersCount} active learner(s) are currently enrolled in this career track.
                <label className="flex items-center gap-2 mt-2 cursor-pointer font-medium text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={forceDelete}
                    onChange={e => setForceDelete(e.target.checked)}
                    className="rounded text-[#315EF7]"
                  />
                  Force delete (unlinks learners&apos; goals from this role)
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmRole(null);
                  setForceDelete(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRole}
                disabled={isSubmitting || (deleteConfirmRole.enrolledLearnersCount > 0 && !forceDelete)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
