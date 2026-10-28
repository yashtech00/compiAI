'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  ShieldCheck,
  Lock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Settings save state
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/admin/settings');
      setSettings(res?.settings || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMsg(null);

    try {
      await apiClient('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordMsg({ type: 'success', text: 'Administrator password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to update password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleSetting = async (key: string, currentValue: any) => {
    try {
      const updatedValue = { ...currentValue, enabled: !currentValue.enabled };
      await apiClient(`/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: updatedValue })
      });
      setSaveMsg({ type: 'success', text: `Setting "${key}" updated.` });
      setTimeout(() => setSaveMsg(null), 3000);
      fetchSettings();
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.message || 'Failed to update setting' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
          Administrative Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
          Configure platform parameters and manage administrator credentials
        </p>
      </div>

      {saveMsg && (
        <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
          saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
        }`}>
          {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{saveMsg.text}</span>
        </div>
      )}

      {/* Password Change Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-[#F3F6FF] text-[#315EF7]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#171717] dark:text-white">Change Administrator Password</h2>
            <p className="text-xs text-[#626262]">Update your password from the default bootstrap credential</p>
          </div>
        </div>

        {passwordMsg && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}>
            {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="mt-4 space-y-3.5 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">
              Current Password (Default: admin12345)
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1">
              New Password (Minimum 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-xs focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
            />
          </div>

          <Button type="submit" size="sm" disabled={isChangingPassword} className="bg-[#315EF7] text-white">
            {isChangingPassword ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      {/* Platform Configuration Settings */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
        <h2 className="text-base font-bold text-[#171717] dark:text-white mb-1">Platform Parameters</h2>
        <p className="text-xs text-[#626262] mb-4">Runtime configuration stored in PostgreSQL</p>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-xs text-[#8E8E8E] py-4 text-center">Loading settings...</p>
          ) : (
            settings.map((setting) => (
              <div key={setting.id} className="p-4 rounded-xl border border-[#F0F0F0] dark:border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#171717] dark:text-white">
                      {setting.key}
                    </span>
                    {setting.value?.enabled !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        setting.value.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {setting.value.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#626262] mb-2">{setting.description}</p>
                  <pre className="text-[11px] font-mono bg-[#FAFAFA] dark:bg-slate-950 p-2 rounded-lg border border-[#F0F0F0] text-[#4A4A4A] overflow-x-auto max-w-lg">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                </div>

                {setting.value?.enabled !== undefined && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleSetting(setting.key, setting.value)}
                    className="shrink-0 text-xs"
                  >
                    {setting.value.enabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
