'use client';

import { useState, useRef } from 'react';
import { ImagePlus, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Props {
  userId: string;
  expenseId?: string;
  onSuccess?: (data: { fileUrl: string; parsedData: any; linkedExpenseId: string | null }) => void;
}

export default function ReceiptUpload({ userId, expenseId, onSuccess }: Props) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('error');
      setMessage('Only JPEG, PNG, or WebP images accepted');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setMessage('File too large (max 10 MB)');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus('uploading');

    const form = new FormData();
    form.append('receipt', file);
    form.append('userId', userId);
    if (expenseId) form.append('expenseId', expenseId);

    try {
      const res = await fetch('/api/upload-receipt', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Upload failed');
        return;
      }

      setStatus('success');
      setMessage(data.linkedExpenseId ? 'Receipt linked to matching expense!' : 'Receipt saved (no matching expense found)');
      onSuccess?.(data);
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  function handleFile(files: FileList | null) {
    if (files?.[0]) upload(files[0]);
  }

  function reset() {
    setStatus('idle');
    setMessage('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Scan Receipt</p>

      {preview ? (
        <div className="relative mb-3">
          <img src={preview} alt="Receipt preview" className="w-full h-32 object-cover rounded-xl border border-slate-100" />
          <button onClick={reset} className="absolute top-2 right-2 bg-white border border-slate-200 rounded-full p-1 shadow">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-3 ${
            dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
          }`}
        >
          <ImagePlus className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Drop receipt or <span className="text-brand-500">browse</span></p>
          <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP · max 10 MB</p>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFile(e.target.files)} />

      {status === 'uploading' && (
        <div className="flex items-center gap-2 text-xs text-brand-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Scanning receipt with AI…
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> {message}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" /> {message}
        </div>
      )}
    </div>
  );
}
