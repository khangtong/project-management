import { useState, useCallback, useRef } from "react";
import ConfirmDialog from "./ConfirmDialog";

export function useConfirm() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmLabel, confirmClass } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ title, message, confirmLabel, confirmClass });
    });
  }, []);

  const handleConfirm = () => {
    setState(null);
    resolverRef.current?.(true);
  };

  const handleCancel = () => {
    setState(null);
    resolverRef.current?.(false);
  };

  const Dialog = state ? (
    <ConfirmDialog
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [confirm, Dialog];
}
