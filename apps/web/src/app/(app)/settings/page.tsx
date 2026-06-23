'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Globe,
  KeyRound,
  Laptop,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserCog,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  MessageCircle,
} from 'lucide-react';
import QRCode from 'react-qr-code';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';
import { cn } from '@/lib/utils';
import { getAccessToken, apiRequest } from '@/lib/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/auth-context';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Download the caller's own data export (JSON) via an authenticated fetch. */
async function downloadDataExport(): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_ORIGIN}/api/v1/documents/me/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trustvexa-data-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const NOTIFICATION_CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    body: 'Receipts, deal milestones, and security alerts land in your inbox.',
  },
  {
    icon: Smartphone,
    title: 'Push',
    body: 'Real-time nudges on your device the moment a deal needs you.',
  },
  {
    icon: Globe,
    title: 'In-app',
    body: 'A running activity feed of every action across your deals.',
  },
];

interface SessionItem {
  id: string;
  device: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  current: boolean;
}

function useSessions() {
  return useQuery({
    queryKey: ['user-sessions'],
    queryFn: async () => {
      return apiRequest<{ sessions: SessionItem[] }>('/auth/sessions');
    },
  });
}

function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      return apiRequest<{
        preferences: Array<{
          eventType: string;
          channel: 'email' | 'in_app';
          enabled: boolean;
        }>;
      }>('/notifications/preferences');
    },
  });
}

function getSessionIcon(device: string | null) {
  const dev = (device || '').toLowerCase();
  if (
    dev.includes('iphone') ||
    dev.includes('android') ||
    dev.includes('mobile') ||
    dev.includes('phone')
  ) {
    return Smartphone;
  }
  if (
    dev.includes('chrome') ||
    dev.includes('firefox') ||
    dev.includes('safari') ||
    dev.includes('edge') ||
    dev.includes('windows') ||
    dev.includes('mac') ||
    dev.includes('linux')
  ) {
    return Laptop;
  }
  return Monitor;
}

function Toggle({
  on,
  onChange,
  defaultOn = false,
  label,
}: {
  on?: boolean;
  onChange?: (v: boolean) => void;
  defaultOn?: boolean;
  label: string;
}) {
  const [localOn, setLocalOn] = React.useState(defaultOn);
  const isControlled = on !== undefined;
  const activeOn = isControlled ? on : localOn;

  const handleToggle = () => {
    if (isControlled) {
      onChange?.(!on);
    } else {
      setLocalOn(!localOn);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activeOn}
      aria-label={label}
      onClick={handleToggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        activeOn ? 'bg-brand-gradient' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          activeOn ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }).map((_, i) => {
  const hour = String(i).padStart(2, '0');
  const ampm = i < 12 ? 'AM' : 'PM';
  const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  const label = `${displayHour}:00 ${ampm}`;
  return { value: `${hour}:00`, label };
});

function usePreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      return apiRequest<{
        timezone: string | null;
        locale: string | null;
        theme: string | null;
        displayFiat: string | null;
        quietHoursStart: string | null;
        quietHoursEnd: string | null;
        emailDigestFrequency: string | null;
        recoveryEmail: string | null;
        profileVisibility: string | null;
        messagingPermission: string | null;
        showOnlineStatus: boolean | null;
        showCompletedDeals: boolean | null;
      }>('/me/preferences');
    },
  });
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [exporting, setExporting] = React.useState(false);
  const router = useRouter();

  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Sessions query
  const sessionQuery = useSessions();
  const sessions = sessionQuery.data?.sessions ?? [];

  // Notification preferences query
  const notificationsPrefsQuery = useNotificationPreferences();
  const prefs = notificationsPrefsQuery.data?.preferences ?? [];

  // Change password form state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passwordStatus, setPasswordStatus] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // 2FA/TOTP state
  const [isSettingUp2fa, setIsSettingUp2fa] = React.useState(false);
  const [totpSetupData, setTotpSetupData] = React.useState<{
    secret: string;
    qrUri: string;
  } | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = React.useState('');
  const [totpError, setTotpError] = React.useState<string | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[] | null>(null);
  const [totpSetupSubmitting, setTotpSetupSubmitting] = React.useState(false);
  const [showDisable2fa, setShowDisable2fa] = React.useState(false);
  const [showRegen2fa, setShowRegen2fa] = React.useState(false);
  const [totpActionCode, setTotpActionCode] = React.useState('');
  const [totpActionSubmitting, setTotpActionSubmitting] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);

  // Secondary/Recovery Email state
  const [tempRecoveryEmail, setTempRecoveryEmail] = React.useState('');
  const [recoveryPassword, setRecoveryPassword] = React.useState('');
  const [recoveryStatus, setRecoveryStatus] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [recoverySubmitting, setRecoverySubmitting] = React.useState(false);

  // Danger zone state
  const [dangerAction, setDangerAction] = React.useState<'deactivate' | 'delete' | null>(null);
  const [dangerPassword, setDangerPassword] = React.useState('');
  const [dangerReason, setDangerReason] = React.useState('');
  const [dangerSubmitting, setDangerSubmitting] = React.useState(false);
  const [dangerStatus, setDangerStatus] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isEmailEnabled = (eventType: string) => {
    const p = prefs.find((x) => x.eventType === eventType && x.channel === 'email');
    return p ? p.enabled : true; // default is true when not explicitly disabled
  };

  const handleTogglePreference = async (eventType: string, enabled: boolean) => {
    try {
      await apiRequest('/notifications/preferences', {
        method: 'PUT',
        body: {
          event_type: eventType,
          channel: 'email',
          enabled,
        },
      });
      void notificationsPrefsQuery.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiRequest(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await apiRequest('/me/sessions', { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 12) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 10 characters.' });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setPasswordStatus({
        type: 'error',
        message: (err instanceof Error ? err.message : String(err)) || 'Failed to update password.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const prefQuery = usePreferences();
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(false);
  const [quietHoursStart, setQuietHoursStart] = React.useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = React.useState('08:00');
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const displayFiat = prefQuery.data?.displayFiat ?? 'USD';
  const emailDigestFrequency = prefQuery.data?.emailDigestFrequency ?? 'immediate';
  const recoveryEmail = prefQuery.data?.recoveryEmail ?? '';

  React.useEffect(() => {
    if (prefQuery.data) {
      const {
        quietHoursStart: qStart,
        quietHoursEnd: qEnd,
        recoveryEmail: recEmail,
      } = prefQuery.data;
      if (qStart && qEnd) {
        setQuietHoursEnabled(true);
        setQuietHoursStart(qStart);
        setQuietHoursEnd(qEnd);
      } else {
        setQuietHoursEnabled(false);
      }
      if (recEmail) {
        setTempRecoveryEmail(recEmail);
      }
    }
  }, [prefQuery.data]);

  const handleSaveQuietHours = async (start: string | null, end: string | null) => {
    setSaveError(null);
    try {
      await apiRequest('/me/preferences', {
        method: 'PATCH',
        body: {
          quietHoursStart: start,
          quietHoursEnd: end,
        },
      });
      void prefQuery.refetch();
    } catch (err) {
      console.error(err);
      setSaveError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to update quiet hours.',
      );
    }
  };

  const handleToggleQuietHours = async (enabled: boolean) => {
    setQuietHoursEnabled(enabled);
    if (enabled) {
      await handleSaveQuietHours(quietHoursStart, quietHoursEnd);
    } else {
      await handleSaveQuietHours(null, null);
    }
  };

  const handleSavePreferences = async (updated: {
    displayFiat?: string;
    emailDigestFrequency?: string;
    profileVisibility?: string;
    messagingPermission?: string;
    showOnlineStatus?: boolean;
    showCompletedDeals?: boolean;
  }) => {
    setSaveError(null);
    try {
      await apiRequest('/me/preferences', {
        method: 'PATCH',
        body: updated,
      });
      void prefQuery.refetch();
    } catch (err) {
      console.error(err);
      setSaveError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to update preferences.',
      );
    }
  };

  // 2FA/TOTP triggers
  const handleInitiate2faSetup = async () => {
    setTotpError(null);
    setBackupCodes(null);
    try {
      const data = await apiRequest<{ secret: string; qrUri: string }>('/auth/totp/setup', {
        method: 'POST',
      });
      setTotpSetupData(data);
      setIsSettingUp2fa(true);
    } catch (err) {
      setTotpError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to initiate 2FA setup.',
      );
    }
  };

  const handleConfirm2faSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setTotpSetupSubmitting(true);
    try {
      const res = await apiRequest<{ backup_codes: string[] }>('/auth/totp/confirm', {
        method: 'POST',
        body: { token: totpConfirmCode },
      });
      setBackupCodes(res.backup_codes);
      setTotpSetupData(null);
      setIsSettingUp2fa(false);
      setTotpConfirmCode('');
    } catch (err) {
      setTotpError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to confirm 2FA code.',
      );
    } finally {
      setTotpSetupSubmitting(false);
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setTotpActionSubmitting(true);
    try {
      await apiRequest('/auth/totp', {
        method: 'DELETE',
        body: { token: totpActionCode },
      });
      setShowDisable2fa(false);
      setTotpActionCode('');
      window.location.reload();
    } catch (err) {
      setTotpError((err instanceof Error ? err.message : String(err)) || 'Failed to disable 2FA.');
    } finally {
      setTotpActionSubmitting(false);
    }
  };

  const handleRegenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setTotpActionSubmitting(true);
    try {
      const res = await apiRequest<{ backup_codes: string[] }>('/auth/totp/backup-codes', {
        method: 'POST',
        body: { token: totpActionCode },
      });
      setBackupCodes(res.backup_codes);
      setShowRegen2fa(false);
      setTotpActionCode('');
    } catch (err) {
      setTotpError(
        (err instanceof Error ? err.message : String(err)) || 'Failed to regenerate backup codes.',
      );
    } finally {
      setTotpActionSubmitting(false);
    }
  };

  const handleCopySecret = () => {
    if (!totpSetupData) return;
    void navigator.clipboard.writeText(totpSetupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const securityChecklist = [
    {
      icon: ShieldCheck,
      title: 'Strong password + breach check',
      body: 'Your password is hashed (never readable) and screened against known breaches.',
      status: 'On',
      done: true,
    },
    {
      icon: KeyRound,
      title: 'Step-up confirmation',
      body: 'Re-verify your identity right before funds are released on a deal.',
      status: 'On',
      done: true,
    },
    {
      icon: Bell,
      title: 'Login alerts',
      body: 'Get an email whenever your account signs in from a new device.',
      status: 'On',
      done: true,
    },
    {
      icon: KeyRound,
      title: 'Two-Factor Authentication',
      body: 'Secure login and critical operations with an authenticator app.',
      status: user?.totpEnabled ? 'On' : 'Off',
      done: !!user?.totpEnabled,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <DashboardPageHeader
        title="Settings"
        description="Manage your appearance, security, and notifications."
      />

      <Reveal>
        <Card className="rounded-2xl border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <UserCog className="h-5 w-5 text-primary" aria-hidden="true" /> Account overview
            </CardTitle>
            <CardDescription>
              A quick snapshot of how your account is configured right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={ShieldCheck}
              label="Security level"
              value={user?.totpEnabled ? 'Very Strong' : 'Strong'}
              hint={user?.totpEnabled ? '2FA Enabled' : 'Step-up + login alerts'}
              accent={user?.totpEnabled ? 'success' : 'primary'}
            />
            <StatCard
              icon={Bell}
              label="Alerts"
              value="Enabled"
              hint="Email + push"
              accent="primary"
            />
            <StatCard
              icon={Activity}
              label="Active sessions"
              value={sessions.length}
              hint="Across your devices"
              accent="accent"
            />
          </CardContent>
        </Card>
      </Reveal>

      {/* 2FA backup codes block */}
      {backupCodes && (
        <Reveal>
          <Card className="rounded-2xl border-success/30 bg-success/[0.02] shadow-soft p-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <ShieldCheck className="h-12 w-12 text-success" />
              <h3 className="font-display text-lg font-bold text-success">
                Save your backup codes
              </h3>
              <p className="text-xs text-muted-foreground max-w-md">
                If you lose your device or authenticator app, these backup codes can be used to log
                into your account. Keep them in a safe place. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 border rounded-xl font-mono text-sm tracking-wide text-foreground w-full max-w-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex justify-center">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = `TrustVexa Escrow 2FA Backup Codes:\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'trustvexa-2fa-backup-codes.txt';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download Codes
                </Button>
                <Button
                  variant="gradient"
                  onClick={() => {
                    setBackupCodes(null);
                    window.location.reload();
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        </Reveal>
      )}

      {/* Main Security and 2FA Card */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Security & 2FA
          </CardTitle>
          <CardDescription>
            Protect your account, logins, and funds transfer operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Breached-password check"
            description="Block passwords found in known data breaches."
          >
            <Toggle defaultOn label="Breached-password check" />
          </SettingRow>
          <SettingRow title="Step-up confirmation" description="Re-confirm before releasing funds.">
            <Toggle defaultOn label="Step-up confirmation" />
          </SettingRow>
          <SettingRow title="Login alerts" description="Email me about new device logins.">
            <Toggle defaultOn label="Login alerts" />
          </SettingRow>

          {/* 2FA/TOTP Setup Area */}
          <div className="py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Adds an additional layer of security to your account by requiring a code from your
                  authenticator app when logging in.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {user?.totpEnabled ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setShowDisable2fa(true);
                        setShowRegen2fa(false);
                        setIsSettingUp2fa(false);
                        setTotpError(null);
                      }}
                    >
                      Disable 2FA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRegen2fa(true);
                        setShowDisable2fa(false);
                        setIsSettingUp2fa(false);
                        setTotpError(null);
                      }}
                    >
                      Regen Codes
                    </Button>
                  </>
                ) : (
                  !isSettingUp2fa && (
                    <Button variant="gradient" onClick={handleInitiate2faSetup}>
                      Enable 2FA
                    </Button>
                  )
                )}
              </div>
            </div>

            {totpError && <p className="text-xs text-destructive mt-3">{totpError}</p>}

            {/* setup QR/Confirm flow */}
            {isSettingUp2fa && totpSetupData && (
              <div className="mt-5 border p-5 rounded-2xl bg-muted/20 space-y-4 animate-fadeIn">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="p-3 bg-white rounded-xl border shrink-0">
                    <QRCode value={totpSetupData.qrUri} size={140} />
                  </div>
                  <div className="space-y-3 w-full">
                    <h4 className="font-display text-sm font-semibold text-foreground">
                      Configure Authenticator App
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Scan the QR code with an authenticator app (like Google Authenticator, Authy,
                      or 1Password). Alternatively, copy the secret key below.
                    </p>
                    <div className="flex items-center gap-2 bg-muted/40 p-2 border rounded-lg max-w-sm">
                      <code className="text-xs font-mono text-foreground select-all truncate flex-1">
                        {totpSetupData.secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={handleCopySecret}
                        title="Copy secret key"
                      >
                        {copiedSecret ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConfirm2faSetup} className="space-y-3 pt-3 border-t">
                  <div className="space-y-1.5 max-w-xs">
                    <Label htmlFor="totpConfirmCode">Verify authentication code</Label>
                    <Input
                      id="totpConfirmCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={totpConfirmCode}
                      onChange={(e) => setTotpConfirmCode(e.target.value.trim())}
                      className="font-mono text-center tracking-widest text-lg"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="gradient"
                      type="submit"
                      disabled={totpSetupSubmitting || totpConfirmCode.length < 6}
                    >
                      {totpSetupSubmitting ? 'Enabling...' : 'Verify & Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setIsSettingUp2fa(false);
                        setTotpSetupData(null);
                        setTotpConfirmCode('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* disable input flow */}
            {showDisable2fa && (
              <form
                onSubmit={handleDisable2fa}
                className="mt-5 border p-5 rounded-2xl bg-destructive/[0.01] border-destructive/20 space-y-4 animate-fadeIn"
              >
                <h4 className="font-display text-sm font-semibold text-destructive">
                  Disable Two-Factor Authentication
                </h4>
                <p className="text-xs text-muted-foreground">
                  To disable 2FA, please enter your current 6-digit authentication code to verify
                  ownership.
                </p>
                <div className="space-y-1.5 max-w-xs">
                  <Label htmlFor="totpActionCode">Authentication code</Label>
                  <Input
                    id="totpActionCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={totpActionCode}
                    onChange={(e) => setTotpActionCode(e.target.value.trim())}
                    className="font-mono text-center tracking-widest text-lg"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    type="submit"
                    disabled={totpActionSubmitting || totpActionCode.length < 6}
                  >
                    {totpActionSubmitting ? 'Disabling...' : 'Confirm & Disable'}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setShowDisable2fa(false);
                      setTotpActionCode('');
                      setTotpError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* regen codes input flow */}
            {showRegen2fa && (
              <form
                onSubmit={handleRegenerateBackupCodes}
                className="mt-5 border p-5 rounded-2xl bg-muted/20 space-y-4 animate-fadeIn"
              >
                <h4 className="font-display text-sm font-semibold text-foreground">
                  Regenerate Backup Codes
                </h4>
                <p className="text-xs text-muted-foreground">
                  Regenerating backup codes will invalidate all your previously generated codes.
                  Please enter your current 6-digit authentication code.
                </p>
                <div className="space-y-1.5 max-w-xs">
                  <Label htmlFor="totpRegenCode">Authentication code</Label>
                  <Input
                    id="totpRegenCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={totpActionCode}
                    onChange={(e) => setTotpActionCode(e.target.value.trim())}
                    className="font-mono text-center tracking-widest text-lg"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="gradient"
                    type="submit"
                    disabled={totpActionSubmitting || totpActionCode.length < 6}
                  >
                    {totpActionSubmitting ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setShowRegen2fa(false);
                      setTotpActionCode('');
                      setTotpError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recovery Email configuration */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Recovery email
          </CardTitle>
          <CardDescription>
            Configure a secondary/recovery email to secure your account and recover it if you lose
            access to your primary email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRecoveryStatus(null);
              setRecoverySubmitting(true);
              try {
                await apiRequest('/auth/recovery-email', {
                  method: 'POST',
                  body: { recoveryEmail: tempRecoveryEmail, currentPassword: recoveryPassword },
                });
                setRecoveryStatus({
                  type: 'success',
                  message: 'Recovery email updated successfully.',
                });
                setRecoveryPassword('');
                void prefQuery.refetch();
              } catch (err) {
                setRecoveryStatus({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Failed to update recovery email.',
                });
              } finally {
                setRecoverySubmitting(false);
              }
            }}
            className="space-y-4"
          >
            {recoveryStatus && (
              <div
                className={cn(
                  'p-3 text-xs rounded-lg border',
                  recoveryStatus.type === 'success'
                    ? 'bg-success/15 text-success border-success/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20',
                )}
              >
                {recoveryStatus.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="recoveryEmailInput">Secondary / Recovery email</Label>
              <Input
                id="recoveryEmailInput"
                type="email"
                value={tempRecoveryEmail}
                onChange={(e) => setTempRecoveryEmail(e.target.value)}
                placeholder="backup@example.com"
                required
              />
            </div>

            {tempRecoveryEmail !== recoveryEmail && (
              <div className="space-y-1.5 animate-fadeIn">
                <Label htmlFor="recoveryPassword">Confirm your current password</Label>
                <Input
                  id="recoveryPassword"
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                />
              </div>
            )}

            <Button
              variant="gradient"
              type="submit"
              disabled={recoverySubmitting || tempRecoveryEmail === recoveryEmail}
            >
              {recoverySubmitting ? 'Saving...' : 'Save recovery email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Choose how TrustVexa looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
                  theme === opt.value
                    ? 'border-primary bg-primary/5 text-foreground shadow-glow'
                    : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <opt.icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Localization and display preferences */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Display preferences
          </CardTitle>
          <CardDescription>Configure localization and currency options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayFiat">Default currency</Label>
            <p className="text-xs text-muted-foreground">
              Select your preferred display currency for transaction fees and values.
            </p>
            <select
              id="displayFiat"
              value={displayFiat}
              onChange={(e) => handleSavePreferences({ displayFiat: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" /> Your data
          </CardTitle>
          <CardDescription>
            Download a copy of your profile, deals, and reviews. Other users&apos; private
            information is never included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void downloadDataExport().finally(() => setExporting(false));
            }}
          >
            {exporting ? 'Preparing…' : 'Download my data (JSON)'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Change password
          </CardTitle>
          <CardDescription>Use at least 10 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            {passwordStatus && (
              <div
                className={cn(
                  'p-3 text-xs rounded-lg border',
                  passwordStatus.type === 'success'
                    ? 'bg-success/15 text-success border-success/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20',
                )}
              >
                {passwordStatus.message}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button variant="gradient" type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </CardTitle>
          <CardDescription>Decide what we email you about.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow title="Deal updates" description="Funding, delivery, and release events.">
            <Toggle
              on={isEmailEnabled('deal:update')}
              onChange={(v) => handleTogglePreference('deal:update', v)}
              label="Deal updates"
            />
          </SettingRow>
          <SettingRow title="Dispute activity" description="Updates when a middleman acts.">
            <Toggle
              on={isEmailEnabled('dispute:update')}
              onChange={(v) => handleTogglePreference('dispute:update', v)}
              label="Dispute activity"
            />
          </SettingRow>
          <SettingRow title="Product news" description="Occasional product announcements.">
            <Toggle
              on={isEmailEnabled('sla:warning')}
              onChange={(v) => handleTogglePreference('sla:warning', v)}
              label="Product news"
            />
          </SettingRow>

          {/* Email Digest Frequency selection */}
          <div className="py-4 border-t">
            <Label htmlFor="emailDigestFrequency">Email digest frequency</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Receive updates immediately or summarized in a daily/weekly digest.
            </p>
            <select
              id="emailDigestFrequency"
              value={emailDigestFrequency}
              onChange={(e) => handleSavePreferences({ emailDigestFrequency: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="immediate">Immediate (per event)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>

          <div className="py-4 border-t">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Quiet hours</p>
                <p className="text-xs text-muted-foreground">
                  Pause notifications during specific hours.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quietHoursEnabled}
                onClick={() => handleToggleQuietHours(!quietHoursEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  quietHoursEnabled ? 'bg-brand-gradient' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    quietHoursEnabled ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            {quietHoursEnabled && (
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quietHoursStart">Start hour</Label>
                  <select
                    id="quietHoursStart"
                    value={quietHoursStart}
                    onChange={(e) => {
                      setQuietHoursStart(e.target.value);
                      void handleSaveQuietHours(e.target.value, quietHoursEnd);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {HOURS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quietHoursEnd">End hour</Label>
                  <select
                    id="quietHoursEnd"
                    value={quietHoursEnd}
                    onChange={(e) => {
                      setQuietHoursEnd(e.target.value);
                      void handleSaveQuietHours(quietHoursStart, e.target.value);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {HOURS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {saveError && <p className="text-xs text-destructive mt-2">{saveError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-destructive/30 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Smartphone className="h-5 w-5" /> Active sessions
          </CardTitle>
          <CardDescription>Sign out of devices you no longer use.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleRevokeAllOtherSessions}
          >
            Sign out of all other sessions
          </Button>
        </CardContent>
      </Card>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Security"
          title="Security checklist"
          subtitle="A few layered safeguards keep your account and your funds protected. Aim to complete every item."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {securityChecklist.map((item) => (
            <Card
              key={item.title}
              className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant={item.done ? 'success' : 'outline'} className="gap-1">
                    {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {item.status}
                  </Badge>
                </div>
                <CardTitle className="font-display text-base">{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Notifications"
          title="Notification channels"
          subtitle="Choose where updates reach you. Security alerts always go to email, even if other channels are off."
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {NOTIFICATION_CHANNELS.map((channel) => (
            <Card key={channel.title} className="rounded-2xl border bg-card shadow-soft">
              <CardHeader>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <channel.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle className="font-display text-base">{channel.title}</CardTitle>
                <CardDescription>{channel.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <Card className="rounded-2xl border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Laptop className="h-5 w-5 text-primary" aria-hidden="true" /> Connected devices
            </CardTitle>
            <CardDescription>Sessions currently signed in to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => {
              const Icon = getSessionIcon(session.device);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{session.device || 'Unknown Device'}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />{' '}
                        {session.ip || 'Unknown IP'}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {session.current ? (
                      <Badge variant="success">This device</Badge>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" aria-hidden="true" />{' '}
                        {session.lastSeenAt
                          ? `Seen ${new Date(session.lastSeenAt).toLocaleDateString()}`
                          : 'Unknown'}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevokeSession(session.id)}
                          aria-label={`Revoke session on ${session.device}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </Reveal>

      {/* Privacy & Profile Visibility (GAP-4) */}
      <Reveal>
        <Card className="rounded-2xl border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
              Privacy &amp; Profile Visibility
            </CardTitle>
            <CardDescription>
              Control who can see your profile, message you, and what information is publicly
              visible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile visibility */}
            <div className="space-y-1.5">
              <Label htmlFor="profileVisibility">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Profile visibility
                </span>
              </Label>
              <select
                id="profileVisibility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefQuery.data?.profileVisibility ?? 'public'}
                onChange={(e) => handleSavePreferences({ profileVisibility: e.target.value })}
              >
                <option value="public">Public — Anyone can view your profile</option>
                <option value="registered">Registered users only</option>
                <option value="private">Private — Only you and counterparties</option>
              </select>
            </div>

            {/* Messaging permission */}
            <div className="space-y-1.5">
              <Label htmlFor="messagingPermission">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Who can message me
                </span>
              </Label>
              <select
                id="messagingPermission"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefQuery.data?.messagingPermission ?? 'anyone'}
                onChange={(e) => handleSavePreferences({ messagingPermission: e.target.value })}
              >
                <option value="anyone">Anyone on the platform</option>
                <option value="counterparties">Only counterparties in my deals</option>
                <option value="nobody">Nobody — disable incoming messages</option>
              </select>
            </div>

            {/* Show online status toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Show online status
                </p>
                <p className="text-xs text-muted-foreground">
                  Let others see when you are currently online.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefQuery.data?.showOnlineStatus ?? true}
                onClick={() =>
                  handleSavePreferences({
                    showOnlineStatus: !(prefQuery.data?.showOnlineStatus ?? true),
                  })
                }
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  (prefQuery.data?.showOnlineStatus ?? true) ? 'bg-brand-gradient' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (prefQuery.data?.showOnlineStatus ?? true)
                      ? 'translate-x-5'
                      : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            {/* Show completed deals count toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Show completed deals count
                </p>
                <p className="text-xs text-muted-foreground">
                  Display the number of completed deals on your public profile.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefQuery.data?.showCompletedDeals ?? true}
                onClick={() =>
                  handleSavePreferences({
                    showCompletedDeals: !(prefQuery.data?.showCompletedDeals ?? true),
                  })
                }
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  (prefQuery.data?.showCompletedDeals ?? true) ? 'bg-brand-gradient' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (prefQuery.data?.showCompletedDeals ?? true)
                      ? 'translate-x-5'
                      : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Danger Zone */}
      <Reveal>
        <Card className="rounded-2xl border-destructive/30 bg-destructive/[0.03] shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" /> Danger zone
            </CardTitle>
            <CardDescription>
              These actions are permanent. Deactivation hides your profile; deletion removes your
              account once all deals are settled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDangerAction('deactivate');
                setDangerPassword('');
                setDangerReason('');
                setDangerStatus(null);
              }}
            >
              Deactivate account
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDangerAction('delete');
                setDangerPassword('');
                setDangerReason('');
                setDangerStatus(null);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Request deletion
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      {/* Danger Action Overlay Modal */}
      {dangerAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-glow animate-fadeIn">
            <h3 className="font-display text-lg font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              {dangerAction === 'deactivate' ? 'Deactivate Account' : 'Request Account Deletion'}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {dangerAction === 'deactivate'
                ? 'Deactivating your account will hide your profile and temporarily pause your activity. You can reactivate it later.'
                : 'This action is permanent and cannot be undone. Your profile and data will be permanently deleted once all your deals are settled.'}
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setDangerStatus(null);
                setDangerSubmitting(true);
                try {
                  const endpoint =
                    dangerAction === 'deactivate' ? '/account/deactivate' : '/account/delete';
                  await apiRequest(endpoint, {
                    method: 'POST',
                    body: { password: dangerPassword, reason: dangerReason || undefined },
                  });
                  setDangerStatus({
                    type: 'success',
                    message:
                      dangerAction === 'deactivate'
                        ? 'Account successfully deactivated. Logging out...'
                        : 'Account deletion successfully requested. Logging out...',
                  });
                  setTimeout(async () => {
                    await logout();
                    router.push('/login');
                  }, 2000);
                } catch (err) {
                  setDangerStatus({
                    type: 'error',
                    message: err instanceof Error ? err.message : 'Action failed.',
                  });
                } finally {
                  setDangerSubmitting(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              {dangerStatus && (
                <div
                  className={cn(
                    'p-3 text-xs rounded-lg border',
                    dangerStatus.type === 'success'
                      ? 'bg-success/15 text-success border-success/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20',
                  )}
                >
                  {dangerStatus.message}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="dangerPassword">Confirm your account password</Label>
                <Input
                  id="dangerPassword"
                  type="password"
                  value={dangerPassword}
                  onChange={(e) => setDangerPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dangerReason">Reason (optional)</Label>
                <Input
                  id="dangerReason"
                  type="text"
                  value={dangerReason}
                  onChange={(e) => setDangerReason(e.target.value)}
                  placeholder="Why are you taking this action?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setDangerAction(null);
                    setDangerPassword('');
                    setDangerReason('');
                    setDangerStatus(null);
                  }}
                  disabled={dangerSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={dangerSubmitting || !dangerPassword}
                >
                  {dangerSubmitting ? 'Confirming...' : 'Yes, Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
