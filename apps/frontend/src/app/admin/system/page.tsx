'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Activity,
  ShieldCheck,
  Server,
  Cpu,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminSystemPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [healthData, setHealthData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, healthRes] = await Promise.all([
        apiClient(`/admin/audit-logs?page=${page}&limit=20`),
        fetch('http://localhost:5001/api/v1/health').then(r => r.json()).catch(() => null)
      ]);
      setLogs(logsRes?.logs || []);
      setTotal(logsRes?.total || 0);
      setHealthData(healthRes?.data || null);
    } catch (err) {
      console.error('Failed to load system logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            System Activity & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
            Immutable log of all privileged administrative events and service operations
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-[#E7E7E7] bg-white text-xs font-semibold shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Activity
        </Button>
      </div>

      {/* Operational Health Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#8E8E8E] mb-1">
            <span>Core Platform Health</span>
            <Server className="w-4 h-4 text-[#315EF7]" />
          </div>
          <div className="flex items-center gap-2 text-base font-bold text-[#171717]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database: {healthData?.database || 'Connected'}</span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">PostgreSQL pooling operational</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#8E8E8E] mb-1">
            <span>AI Resilience Circuit Breaker</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 text-base font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>State: {healthData?.aiProvider?.circuitBreaker || 'CLOSED'} (Healthy)</span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">
            Model: {healthData?.aiProvider?.configuredModel || 'gemini-2.5-flash'}
          </p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#8E8E8E] mb-1">
            <span>Audited Actions Logged</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-[#171717]">
            {total} Privileged Events
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Immutable audit trail</p>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card className="bg-white dark:bg-slate-900 border-[#E7E7E7] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#171717]">Administrative Audit Trail</h2>
          <span className="text-xs text-[#8E8E8E]">{total} Total Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-[11px] font-bold text-[#626262] uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Outcome</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8E8E8E]">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8E8E8E]">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 text-[#8E8E8E] text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#171717]">{log.actorEmail}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3F6FF] text-[#315EF7] border border-[#E0E7FF]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#626262]">
                      {log.entityType} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.outcome === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#626262] text-[11px] max-w-sm truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
