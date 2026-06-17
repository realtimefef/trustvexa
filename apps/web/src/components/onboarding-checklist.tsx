'use client';

/**
 * Onboarding checklist shown on the dashboard (task 9.4). Renders the user's
 * remaining getting-started steps with a progress summary and lets them mark a
 * step complete. The card hides itself once all required steps are done.
 */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/client';
import type { OnboardingResponse } from '@/lib/api/types';

export function OnboardingChecklist({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();

  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    enabled,
    queryFn: async () => apiRequest<OnboardingResponse>('/onboarding'),
  });

  const completeMutation = useMutation({
    mutationFn: async (taskKey: string) =>
      apiRequest<OnboardingResponse>(`/onboarding/${taskKey}`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['onboarding'], data);
    },
  });

  const data = onboardingQuery.data;
  if (!data || data.complete) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          {data.progress.completed} of {data.progress.total} steps complete ({data.progress.percent}
          %)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.tasks.map((task) => (
          <div
            key={task.key}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <span className={task.done ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>
              {task.title}
              {task.required ? (
                <span className="ml-1 text-xs text-muted-foreground">(required)</span>
              ) : null}
            </span>
            {task.done ? (
              <span className="text-xs text-muted-foreground">Done</span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate(task.key)}
              >
                Mark done
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
