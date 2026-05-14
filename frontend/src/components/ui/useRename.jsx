import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

function RenameDialog({
  title,
  initialValue,
  placeholder,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(initialValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue) return;
    onConfirm(trimmed);
  };

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
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
        <div className="h-1 bg-ocean w-full" />

        <form onSubmit={handleSubmit} className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-5 h-5 text-ocean"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>

          <h3 className="text-center text-base font-semibold text-charcoal mb-4">
            {title || "Rename"}
          </h3>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onCancel()}
            placeholder={placeholder || "Enter a name…"}
            maxLength={80}
            className="w-full px-3 py-2.5 rounded-xl border border-cream-border text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-colors"
          />
          <p className="text-[10px] text-gray-medium mt-1 text-right">
            {value.length}/80
          </p>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-cream-border text-sm font-medium text-gray-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim() || value.trim() === initialValue}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function useRename() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const rename = useCallback(({ title, initialValue, placeholder } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ title, initialValue, placeholder });
    });
  }, []);

  const handleConfirm = (newName) => {
    setState(null);
    resolverRef.current?.(newName);
  };

  const handleCancel = () => {
    setState(null);
    resolverRef.current?.(null);
  };

  const Dialog = state ? (
    <RenameDialog
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [rename, Dialog];
}
