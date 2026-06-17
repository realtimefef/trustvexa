'use client';

import * as React from 'react';
import { UploadCloud, ShieldAlert, ShieldCheck, Loader2, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  className?: string;
}

export function FileDropzone({
  onFileSelect,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'],
  className,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [scanState, setScanState] = React.useState<'idle' | 'scanning' | 'clean' | 'infected'>(
    'idle',
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndProcessFile = (file: File) => {
    setError(null);
    setSelectedFile(null);
    setScanState('idle');

    if (!allowedTypes.includes(file.type)) {
      setError(
        `Invalid file type. Allowed: ${allowedTypes.map((t) => (t.split('/')[1] || t).toUpperCase()).join(', ')}`,
      );
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`File size exceeds limit (${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB).`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Simulate malware scanner job
    setScanState('scanning');
    setTimeout(() => {
      // 90% chance clean, 10% quarantine (for simulation)
      const isInfected = Math.random() < 0.05;
      setScanState(isInfected ? 'infected' : 'clean');
    }, 2500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setScanState('idle');
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive
              ? 'border-primary bg-primary/[0.04]'
              : 'border-border/40 hover:border-primary/50 bg-card/10'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={allowedTypes.join(',')}
            onChange={handleFileInput}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center w-full h-full"
          >
            <UploadCloud className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PNG, JPG, PDF (max {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB)
            </p>
          </label>

          {error && (
            <div className="absolute bottom-2 left-2 right-2 text-xs text-destructive bg-destructive/10 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Safe preview scanner status */}
            <SafePreview state={scanState} />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground border-border/40"
              onClick={removeFile}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SafePreviewProps {
  state: 'idle' | 'scanning' | 'clean' | 'infected';
}

export function SafePreview({ state }: SafePreviewProps) {
  if (state === 'idle' || state === 'scanning') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <Loader2 className="h-3 w-3 animate-spin" /> Scanning…
      </span>
    );
  }

  if (state === 'infected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
        <ShieldAlert className="h-3 w-3" /> Quarantined
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="h-3 w-3" /> Safe
    </span>
  );
}
