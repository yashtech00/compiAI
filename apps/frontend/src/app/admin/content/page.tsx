'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BookOpen,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2
} from 'lucide-react';

export default function AdminContentPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [cycleData, setCycleData] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadContent() {
      setIsLoading(true);
      try {
        const [skillsRes, cycleRes] = await Promise.all([
          apiClient('/admin/skills'),
          apiClient('/admin/check-cycles')
        ]);
        setSkills(skillsRes?.skills || []);
        setCycleData(cycleRes);
      } catch (err) {
        console.error('Failed to load curriculum:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, []);

  const handleValidateGraph = async () => {
    setIsValidating(true);
    try {
      const res = await apiClient('/admin/check-cycles');
      setCycleData(res);
    } catch (err) {
      console.error('Graph validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const filteredSkills = skills.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            Curriculum Content & Knowledge Graph
          </h1>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
            Structured skill hierarchy, concepts, and DAG prerequisite validation
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleValidateGraph}
          disabled={isValidating}
          className="border-[#E7E7E7] bg-white text-xs font-semibold shadow-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#315EF7] ${isValidating ? 'animate-spin' : ''}`} />
          Verify Prerequisite DAG
        </Button>
      </div>

      {/* DAG Integrity Verification Card */}
      {cycleData && (
        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${cycleData.hasCycle ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {cycleData.hasCycle ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-[#171717]">
                    {cycleData.hasCycle ? 'Prerequisite Cycle Detected' : 'Directed Acyclic Graph (DAG) Verified'}
                  </span>
                  <span className="text-[11px] text-[#8E8E8E]">
                    ({cycleData.nodesChecked} Concepts, {cycleData.edgesChecked} Prerequisite Edges)
                  </span>
                </div>
                <p className="text-xs text-[#626262] leading-relaxed">
                  {cycleData.cycleDetails}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter skills by name or domain..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E7E7] bg-white text-xs text-[#171717] focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
        />
      </div>

      {/* Skills & Concepts List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-[#8E8E8E] py-8 text-center">Loading curriculum hierarchy...</p>
        ) : (
          filteredSkills.map((skill: any) => (
            <Card key={skill.id} className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-[#171717]">{skill.name}</span>
                  <Badge variant="default" size="sm">{skill.category}</Badge>
                  <span className="text-[11px] text-[#8E8E8E]">Difficulty {skill.difficulty}/5</span>
                </div>
                <span className="text-xs text-[#8E8E8E]">
                  {skill.concepts?.length || 0} concept modules
                </span>
              </div>
              <p className="text-xs text-[#626262] mb-3 leading-relaxed">{skill.description}</p>

              {/* Concept Pills */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F0F0F0]">
                {skill.concepts?.map((c: any) => (
                  <span key={c.id} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F5F5F5] text-[#333] border border-[#EBEBEB]">
                    {c.name} <span className="opacity-60 font-semibold">({c.difficulty})</span>
                  </span>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
