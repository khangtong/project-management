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

  const [width, setWidth] = useState(() => (isActive ? 30 : 0));
  const [visible, setVisible] = useState(() => isActive);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let startTimer;
    let crawlTimer;
    let completeTimer;
    let hideTimer;

    if (isActive) {
      startTimer = setTimeout(() => {
        setFadeOut(false);
        setVisible(true);
        setWidth(30);
      }, 0);
      crawlTimer = setTimeout(() => setWidth(70), 300);
      completeTimer = setTimeout(() => setWidth(85), 900);
    } else if (visible) {
      startTimer = setTimeout(() => setWidth(100), 0);
      completeTimer = setTimeout(() => {
        setFadeOut(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          setWidth(0);
          setFadeOut(false);
        }, 300);
      }, 200);
    }

    return () => {
      clearTimeout(startTimer);
      clearTimeout(crawlTimer);
      clearTimeout(completeTimer);
      clearTimeout(hideTimer);
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
