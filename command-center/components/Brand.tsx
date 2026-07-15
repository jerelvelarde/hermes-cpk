"use client";

// Drawn brand marks — crisp SVGs instead of emoji glyphs, so the chrome reads
// as designed rather than placeholder. Both scale with `size` and take a color.

export function HermesMark({ size = 18, color = "var(--hermes)" }: { size?: number; color?: string }) {
  // A simplified caduceus: winged staff with two entwined serpents.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="3" r="1.4" fill={color} stroke="none" />
        <line x1="12" y1="4.6" x2="12" y2="21.5" />
        <path d="M12 7C7.6 8.4 7.6 11.6 12 13c4.4 1.4 4.4 4.6 0 6" />
        <path d="M12 7c4.4 1.4 4.4 4.6 0 6-4.4 1.4-4.4 4.6 0 6" />
        <path d="M12 6.4C10 4.9 7.2 5 5.3 6.7" />
        <path d="M12 6.4c2-1.5 4.8-1.4 6.7.3" />
      </g>
    </svg>
  );
}

export function CopilotKitMark({ size = 18 }: { size?: number }) {
  // Indigo rounded-square badge with a minimal copilot glyph (antenna + eyes).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="2.5" y="5" width="19" height="15" rx="5" fill="var(--copilot)" />
      <rect x="2.5" y="5" width="19" height="15" rx="5" fill="url(#ckg)" fillOpacity="0.35" />
      <defs>
        <linearGradient id="ckg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="12" y1="2.4" x2="12" y2="5" stroke="var(--copilot-2)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="2.2" r="1.2" fill="var(--copilot-2)" />
      <circle cx="8.8" cy="12.5" r="1.7" fill="#fff" />
      <circle cx="15.2" cy="12.5" r="1.7" fill="#fff" />
    </svg>
  );
}

// A small status LED that pulses when live.
export function Led({ color, live = false }: { color: string; live?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${live ? "live-dot" : ""}`}
      style={{ background: color, color, boxShadow: live ? `0 0 8px ${color}` : undefined }}
    />
  );
}
