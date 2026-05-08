import { createPortal } from "react-dom";

/**
 * ConfirmDialog — rendered by useConfirm hook.
 * Never use directly; use the useConfirm hook instead.
 */
export default function ConfirmDialog({ title, message, confirmLabel = "Delete", confirmClass, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-cream-border overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Top accent strip */}
        <div className="h-1 bg-red-400 w-full" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>

          <h3 className="text-center text-base font-semibold text-charcoal mb-2">{title}</h3>
          {message && (
            <p className="text-center text-sm text-gray-medium leading-relaxed">{message}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-cream-border text-sm font-medium text-gray-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={confirmClass || "flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
