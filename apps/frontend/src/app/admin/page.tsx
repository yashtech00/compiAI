'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, Users, BookOpen, Layers, RefreshCw } from 'lucide-react';

interface CycleData {
  hasCycle: boolean;
  nodesChecked: number;
  edgesChecked: number;
  cycleDetails: string;
}

interface AdminSkill {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  description: string;
  concepts?: Array<{
    id: string;
    name: string;
    difficulty: string;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidatingCycles, setIsValidatingCycles] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      if (!authLoading && !isAdmin) {
        setIsLoading(false);
        return;
      }

      try {
        const [statsRes, skillsRes, cycleRes] = await Promise.all([
          apiClient('/admin/stats').catch(() => null),
          apiClient('/admin/skills').catch(() => null),
          apiClient('/admin/check-cycles').catch(() => null)
        ]);

        if (statsRes) setStats(statsRes);
        if (skillsRes?.skills) setSkills(skillsRes.skills);
        if (cycleRes) setCycleData(cycleRes);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      loadAdminData();
    }
  }, [authLoading, isAdmin]);

  const handleValidateGraph = async () => {
    setIsValidatingCycles(true);
    try {
      const res = await apiClient('/admin/check-cycles');
      setCycleData(res);
    } catch (err) {
      console.error('Graph validation error:', err);
    } finally {
      setIsValidatingCycles(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Verifying administrative permissions...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <Card className="p-8 border-rose-900/50 bg-rose-950/20">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-xs text-slate-400 mb-6">
            You must be signed in as an administrator to access the curriculum management console.
          </p>
          <Button onClick={() => router.push('/today')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple">Admin Center</Badge>
            <span className="text-xs text-slate-400">Curriculum & Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Curriculum Operations
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          isLoading={isValidatingCycles}
          onClick={handleValidateGraph}
          className="gap-2 shrink-0 border-indigo-500/30 text-indigo-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Verify Prerequisite DAG
        </Button>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Skills</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalSkills || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Concepts</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalConcepts || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Learning Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalSessions || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pro Subscribers</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.proSubscriptions || 0}</div>
        </Card>
      </div>

      {/* Prerequisite Cycle Diagnostic Box */}
      {cycleData && (
        <Card className="p-5 mb-8 bg-slate-900/60 border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {cycleData.hasCycle ? (
                  <Badge variant="warning">Prerequisite Cycle Detected</Badge>
                ) : (
                  <Badge variant="success">Directed Acyclic Graph (DAG) Valid</Badge>
                )}
                <span className="text-xs text-slate-400">
                  {cycleData.nodesChecked} concepts, {cycleData.edgesChecked} prerequisite edges
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{cycleData.cycleDetails}</p>
            </div>
            <div className={`p-2 rounded-lg ${cycleData.hasCycle ? 'bg-rose-950/40 text-rose-400' : 'bg-emerald-950/40 text-emerald-400'}`}>
              {cycleData.hasCycle ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
          </div>
        </Card>
      )}

      {/* Skills and Concepts List */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Curriculum Skills & Concept Units</h2>
        <div className="space-y-3">
          {skills.map((skill) => (
            <Card key={skill.id} className="p-4 bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{skill.name}</span>
                  <Badge variant="default" size="sm">{skill.category}</Badge>
                  <span className="text-xs text-slate-500">Diff: {skill.difficulty}/5</span>
                </div>
                <span className="text-xs text-slate-400">
                  {skill.concepts?.length || 0} concepts defined
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{skill.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                {skill.concepts?.map((c: any) => (
                  <span key={c.id} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {c.name} ({c.difficulty})
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
