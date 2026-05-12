import { useEffect, useRef } from 'react';

/**
 * Reusable confirmation dialog.
 * Props:
 *   open: boolean
 *   title: string
 *   message: string
 *   confirmLabel?: string  (default "Ya, Lanjutkan")
 *   cancelLabel?: string   (default "Batal")
 *   variant?: 'danger' | 'warning' | 'info'  (default 'danger')
 *   onConfirm: () => void
 *   onCancel: () => void
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    variant = 'danger',
    onConfirm,
    onCancel,
}) {
    const cancelRef = useRef(null);

    // Focus cancel button when dialog opens (safer default)
    useEffect(() => {
        if (open) cancelRef.current?.focus();
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    if (!open) return null;

    const ICON = {
        danger: (
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </div>
        ),
        warning: (
            <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            </div>
        ),
        info: (
            <div className="w-14 h-14 rounded-full bg-ocean-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-ocean-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        ),
    };

    const CONFIRM_STYLE = {
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        info: 'bg-ocean-600 hover:bg-ocean-700 text-white',
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
        >
            {/* Dialog card */}
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-[slideInUp_0.2s_ease]"
                onClick={e => e.stopPropagation()}
            >
                {ICON[variant]}

                <h2 id="dialog-title" className="text-lg font-black text-gray-800 mb-2">
                    {title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md ${CONFIRM_STYLE[variant]}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
