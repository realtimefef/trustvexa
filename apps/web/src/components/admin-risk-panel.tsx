'use client';

import * as React from 'react';
import { ShieldAlert, Flag, Users, FileWarning } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RiskData {
  riskScore: number;
  warnings: string[];
  recentFails: number;
  ipAddresses: string[];
  suspiciousLoginsCount: number;
}

interface AdminRiskPanelProps {
  userId: string;
  username: string;
  riskData: RiskData;
  className?: string;
}

export function AdminRiskPanel({ userId, username, riskData, className }: AdminRiskPanelProps) {
  const isHighRisk = riskData.riskScore > 60 || riskData.warnings.length > 2;

  return (
    <Card className={`rounded-2xl border bg-card shadow-soft ${className}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-primary" /> Risk Intelligence
          </CardTitle>
          <Badge variant={isHighRisk ? 'destructive' : 'warning'}>
            Score: {riskData.riskScore}/100
          </Badge>
        </div>
        <CardDescription>
          Abuse vectors and connection fingerprints for user: <strong>{username}</strong> (ID:{' '}
          {userId.slice(0, 8)})
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Risk Status Indicator */}
        <div
          className={`flex gap-3 items-start p-4 rounded-xl border ${
            isHighRisk
              ? 'border-red-500/30 bg-red-500/[0.03] text-red-600 dark:text-red-400'
              : 'border-amber-500/30 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400'
          }`}
        >
          {isHighRisk ? (
            <Flag className="h-5 w-5 shrink-0 mt-0.5 text-red-500 animate-pulse" />
          ) : (
            <FileWarning className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          )}
          <div>
            <p className="text-xs font-semibold text-foreground">
              {isHighRisk ? 'Abuse Escalation Recommended' : 'Standard Watchlist'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
              {isHighRisk
                ? 'This user exhibits multiple risk factors. Consider deactivating sessions or initiating a trust level restriction.'
                : 'Minor risk indicators detected. Monitor transaction and message patterns closely.'}
            </p>
          </div>
        </div>

        {/* Technical metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-muted/20 p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">
              Failed Logins
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-1">
              {riskData.recentFails}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">
              Suspicious Logins
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-1">
              {riskData.suspiciousLoginsCount}
            </p>
          </div>
        </div>

        {/* Warnings list */}
        {riskData.warnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Triggered Risk Rules</p>
            <ul className="space-y-1">
              {riskData.warnings.map((w, idx) => (
                <li key={idx} className="flex gap-2 items-center text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Connection detail */}
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Associated IPs ({riskData.ipAddresses.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {riskData.ipAddresses.map((ip) => (
              <Badge key={ip} variant="outline" className="font-mono text-[10px]">
                {ip}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
