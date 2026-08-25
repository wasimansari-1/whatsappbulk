import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, X } from 'lucide-react';

const ToastContext = createContext(null);

function ToastItem({ toast, onRemove }) {
  const isTimed = toast.duration > 0 && toast.type !== 'loading';

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex items-start p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all transform duration-300 animate-in fade-in slide-in-from-top-4 ${
        toast.type === 'success'
          ? 'bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-500/10'
          : toast.type === 'error'
          ? 'bg-slate-900/95 border-rose-500/40 text-white shadow-rose-500/10'
          : toast.type === 'warning'
          ? 'bg-slate-900/95 border-amber-500/40 text-white shadow-amber-500/10'
          : toast.type === 'loading'
          ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-500/15'
          : 'bg-slate-900/95 border-slate-700/60 text-white'
      }`}
    >
      {/* Toast Icon */}
      <div className="mr-3.5 mt-0.5 shrink-0">
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-sm" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 drop-shadow-sm" />}
        {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 drop-shadow-sm" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 drop-shadow-sm" />}
        {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />}
      </div>

      {/* Toast Content */}
      <div className="flex-1 min-w-0 pr-3">
        {toast.title && <h5 className="text-xs font-black text-slate-100 tracking-tight">{toast.title}</h5>}
        <p className="text-xs text-slate-300 leading-relaxed break-words font-medium mt-0.5">{toast.message}</p>
      </div>

      {/* Close Button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0 hover:bg-slate-800"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* ANIMATED PROGRESS BAR */}
      {isTimed ? (
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 transition-all origin-left ${
            toast.type === 'success'
              ? 'bg-emerald-500'
              : toast.type === 'error'
              ? 'bg-rose-500'
              : toast.type === 'warning'
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
          style={{
            animation: `toastProgress ${toast.duration}ms linear forwards`
          }}
        />
      ) : toast.type === 'loading' ? (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 animate-pulse w-full" />
        </div>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title = '', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast = { id, type, message, title, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, title = 'Success') => addToast('success', msg, title, 4000),
    error: (msg, title = 'Error') => addToast('error', msg, title, 5000),
    info: (msg, title = 'Information') => addToast('info', msg, title, 4000),
    warning: (msg, title = 'Warning') => addToast('warning', msg, title, 4500),
    loading: (msg, title = 'Processing...') => addToast('loading', msg, title, 0),
    dismiss: (id) => removeToast(id)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Global CSS for Progress Bar Animation */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Floating Animated Toast Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 pointer-events-none max-w-sm w-full px-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default useToast;
