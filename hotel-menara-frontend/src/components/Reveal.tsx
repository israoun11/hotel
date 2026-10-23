import type { ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";

/** Wraps content that fades in gently the first time it scrolls into view. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
