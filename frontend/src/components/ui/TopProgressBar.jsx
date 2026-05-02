import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Thin progress bar at the very top of the viewport.
 * Activates whenever any React Query mutation or fetch is in-flight.
 */
// Activates only for mutations, not background fetches
export default function TopProgressBar() {
  const isMutating = useIsMutating();
  const isActive = isMutating > 0;

  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let raf;
    let timeout;

    if (isActive) {
      setFadeOut(false);
      setVisible(true);
      // Quickly jump to 30%, then slowly crawl to 85%
      setWidth(30);
      timeout = setTimeout(() => setWidth(70), 300);
      raf = setTimeout(() => setWidth(85), 900);
    } else if (visible) {
      // Complete the bar then fade out
      setWidth(100);
      timeout = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          setWidth(0);
          setFadeOut(false);
        }, 300);
      }, 200);
    }

    return () => {
      clearTimeout(timeout);
      clearTimeout(raf);
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none"
      style={{ opacity: fadeOut ? 0 : 1, transition: "opacity 300ms ease" }}
    >
      <div
        className="h-full bg-ocean"
        style={{
          width: `${width}%`,
          transition: "width 400ms ease",
          boxShadow: "0 0 8px rgba(76, 172, 188, 0.6)",
        }}
      />
    </div>
  );
}
