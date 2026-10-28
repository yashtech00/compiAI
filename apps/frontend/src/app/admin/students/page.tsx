'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  UserPlus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  UserX,
  UserCheck,
  Trash2,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<any | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [newStudent, setNewStudent] = useState({
    email: '',
    password: '',
    displayName: '',
    experienceLevel: 'BEGINNER',
    dailyMinutes: 15
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '12',
        search: search.trim(),
        ...(statusFilter ? { status: statusFilter } : {})
      });
      const res = await apiClient(`/admin/students?${query.toString()}`);
      setStudents(res.students || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      await apiClient('/admin/students', {
        method: 'POST',
        body: JSON.stringify(newStudent)
      });
      setCreateModalOpen(false);
      setNewStudent({ email: '', password: '', displayName: '', experienceLevel: 'BEGINNER', dailyMinutes: 15 });
      setActionSuccess('Student account created successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchStudents();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to create student account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (student: any) => {
    const newStatus = student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient(`/admin/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setActionSuccess(`Student account ${newStatus.toLowerCase()} successfully.`);
      setTimeout(() => setActionSuccess(null), 3500);
      fetchStudents();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update student status');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;
    try {
      await apiClient(`/admin/students/${deleteConfirmStudent.id}`, {
        method: 'DELETE'
      });
      setDeleteConfirmStudent(null);
      setActionSuccess('Student account safely deleted.');
      setTimeout(() => setActionSuccess(null), 3500);
      fetchStudents();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete student');
    }
  };

  const exportCSV = () => {
    if (students.length === 0) return;
    const headers = ['ID', 'Email', 'Display Name', 'Career Goal', 'Status', 'Roadmap Version', 'Progress %', 'Sessions', 'Registered At'];
    const rows = students.map(s => [
      s.id,
      s.email,
      `"${s.displayName}"`,
      `"${s.careerGoal}"`,
      s.status,
      s.currentRoadmapVersion,
      s.roadmapProgress,
      s.totalSessions,
      s.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
            Directory of {total} registered learners with live progress telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="border-[#E7E7E7] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-[#315EF7] hover:bg-[#244DE0] text-white text-xs font-semibold shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <Card className="p-3 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950 text-xs text-[#171717] dark:text-white placeholder-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#315EF7]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#626262]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950 text-xs text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#315EF7]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </Card>

      {/* Students Data Table */}
      <Card className="bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F0F0F0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950 text-[11px] font-bold text-[#626262] dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Career Goal</th>
                <th className="py-3 px-4">Roadmap</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sessions</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0] dark:divide-slate-800/80 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8E8E8E]">
                    <div className="w-6 h-6 border-2 border-[#315EF7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8E8E8E]">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors">
                    {/* Student Identity */}
                    <td className="py-3.5 px-4">
                      <Link href={`/admin/students/${student.id}`} className="group block">
                        <span className="font-semibold text-[#171717] dark:text-white group-hover:text-[#315EF7] transition-colors block">
                          {student.displayName}
                        </span>
                        <span className="text-[11px] text-[#8E8E8E] block">{student.email}</span>
                      </Link>
                    </td>

                    {/* Career Goal */}
                    <td className="py-3.5 px-4 font-medium text-[#171717] dark:text-slate-200">
                      {student.careerGoal}
                    </td>

                    {/* Roadmap Version */}
                    <td className="py-3.5 px-4">
                      {student.currentRoadmapVersion > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F6FF] text-[#315EF7] border border-[#E0E7FF]">
                          V{student.currentRoadmapVersion}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#A0A0A0]">None</span>
                      )}
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-semibold text-[#626262] mb-1">
                          <span>{student.roadmapProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E5E7EB] dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#315EF7] rounded-full"
                            style={{ width: `${student.roadmapProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        student.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {student.status}
                      </span>
                    </td>

                    {/* Total Sessions */}
                    <td className="py-3.5 px-4 text-[#626262] dark:text-slate-400">
                      {student.totalSessions} sessions
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-[#8E8E8E] text-[11px] whitespace-nowrap">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="p-1.5 rounded-lg hover:bg-[#F3F6FF] text-[#626262] hover:text-[#315EF7] transition-colors"
                          title="View Profile & Intelligence"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(student)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-[#626262] hover:text-amber-600 transition-colors"
                          title={student.status === 'ACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
                        >
                          {student.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmStudent(student)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-[#626262] hover:text-rose-600 transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-[#F0F0F0] dark:border-slate-800 flex items-center justify-between text-xs text-[#626262]">
          <span>
            Showing {students.length} of {total} students (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Student Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute right-4 top-4 text-[#8E8E8E] hover:text-[#171717]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-[#171717] dark:text-white mb-1">Create Student Account</h2>
            <p className="text-xs text-[#626262] mb-4">Provision a new learner account with secure password hashing</p>

            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.displayName}
                  onChange={(e) => setNewStudent({ ...newStudent, displayName: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="alex@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">Track</label>
                  <select
                    value={newStudent.experienceLevel}
                    onChange={(e) => setNewStudent({ ...newStudent, experienceLevel: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">Pacing (mins/day)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={newStudent.dailyMinutes}
                    onChange={(e) => setNewStudent({ ...newStudent, dailyMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#315EF7] text-white">
                  {isSubmitting ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white dark:bg-slate-900 border-[#E7E7E7] p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#171717] mb-1">Confirm Student Deletion</h2>
            <p className="text-xs text-[#626262] leading-relaxed mb-4">
              Are you sure you want to permanently delete <strong className="text-[#171717]">{deleteConfirmStudent.email}</strong>? All associated sessions, assessment attempts, and roadmap versions will be purged. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmStudent(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDeleteStudent} className="bg-rose-600 hover:bg-rose-700 text-white">
                Delete Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
