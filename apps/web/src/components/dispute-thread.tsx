'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Send, Download } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { FileDropzone } from '@/components/file-dropzone';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DisputeMessage {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface EvidenceItem {
  id: string;
  fileName: string;
  fileHash: string;
  uploadedByRole: string;
  createdAt: string;
}

interface DisputeThreadProps {
  disputeId: string;
  className?: string;
}

export function DisputeThread({ disputeId, className }: DisputeThreadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Fetch dispute messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['dispute-messages', disputeId],
    queryFn: async () => {
      const res = await apiRequest<{ messages: DisputeMessage[] }>(
        `/disputes/${disputeId}/messages`,
      );
      return res.messages || [];
    },
  });

  // Fetch dispute evidence
  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ['dispute-evidence', disputeId],
    queryFn: async () => {
      const res = await apiRequest<{ evidence: EvidenceItem[] }>(
        `/disputes/${disputeId}/evidence`,
      );
      return res.evidence || [];
    },
  });

  // Post message mutation
  const postMessageMutation = useMutation({
    mutationFn: async (msg: string) =>
      apiRequest(`/disputes/${disputeId}/messages`, {
        method: 'POST',
        body: { message: msg },
      }),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['dispute-messages', disputeId] });
      toast('Message posted successfully to dispute thread', 'success');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      postMessageMutation.mutate(text);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      // Compute a real SHA-256 of the file content using the Web Crypto API so
      // the displayed hash reflects actual file integrity. Math.random() was
      // previously used here, which produced a misleading "SHA-256" label.
      // (Audit FIX-P3-2)
      const arrayBuffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await apiRequest(`/disputes/${disputeId}/evidence`, {
        method: 'POST',
        body: {
          fileName: selectedFile.name,
          fileHash,
        },
      });

      setSelectedFile(null);
      void queryClient.invalidateQueries({ queryKey: ['dispute-evidence', disputeId] });
      toast('Evidence uploaded and hash locked', 'success');
    } catch {
      toast('Failed to upload evidence file', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`grid gap-6 md:grid-cols-[2fr_1fr] ${className}`}>
      {/* Messages timeline */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft flex flex-col h-[30rem]">
        <div className="flex items-center gap-2 border-b pb-3 mb-4">
          <ShieldAlert className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Dispute Thread</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messagesLoading ? (
            <p className="text-xs text-muted-foreground text-center py-10">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No messages yet.</p>
          ) : (
            <ol className="space-y-3">
              {messages.map((m) => (
                <li key={m.id} className="rounded-xl border bg-muted/20 p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                    <span>
                      User {m.senderId.slice(0, 6)} ({m.senderRole})
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-foreground leading-normal">{m.message}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            type="text"
            placeholder="Message the mediator or counterparty..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={postMessageMutation.isPending}
            className="flex-1 h-9 text-xs bg-muted/40 border-border/40 focus-visible:ring-primary/20"
          />
          <Button
            type="submit"
            variant="gradient"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!text.trim() || postMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Evidence board */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft flex flex-col h-[30rem]">
        <h3 className="text-sm font-semibold text-foreground mb-4">Evidence Locker</h3>

        {/* Upload dropzone */}
        <div className="mb-4">
          <FileDropzone onFileSelect={(file) => setSelectedFile(file)} />
          {selectedFile && (
            <Button
              onClick={handleFileUpload}
              disabled={uploading}
              variant="gradient"
              size="sm"
              className="mt-2 w-full text-xs font-semibold"
            >
              {uploading ? 'Locking Hash…' : 'Submit Locked Evidence'}
            </Button>
          )}
        </div>

        {/* Evidence files list */}
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Locked Evidence ({evidence.length})
          </p>
          {evidenceLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Loading evidence locker…
            </p>
          ) : evidence.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No evidence submitted.</p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border bg-muted/10 p-3 flex justify-between gap-3 items-start"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold text-foreground truncate">
                      {item.fileName}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate font-mono">
                      SHA-256: {item.fileHash.slice(0, 16)}…
                    </p>
                    <p className="text-[9px] text-muted-foreground">By: {item.uploadedByRole}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
