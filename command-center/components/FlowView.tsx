"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TraceEvent } from "@/lib/types";
import { HermesMark, CopilotKitMark } from "./Brand";

// ---- Topology -------------------------------------------------------------
// Four logical nodes across the pipeline. x is the horizontal center (%).
type NodeId = "app" | "runtime" | "agui" | "hermes";

const NODES: {
  id: NodeId;
  label: string;
  sub: string;
  x: number;
  color: string;
  mark?: "copilot" | "hermes";
}[] = [
  { id: "app", label: "App", sub: "CopilotKit UI", x: 11, color: "var(--copilot)", mark: "copilot" },
  { id: "runtime", label: "CopilotKit", sub: "Runtime", x: 37, color: "var(--copilot)", mark: "copilot" },
  { id: "agui", label: "AG-UI", sub: "Server", x: 63, color: "var(--copilot-2)" },
  { id: "hermes", label: "Hermes", sub: "gpt-5.4", x: 89, color: "var(--hermes)", mark: "hermes" },
];
const X = Object.fromEntries(NODES.map((n) => [n.id, n.x])) as Record<NodeId, number>;

// Which way an event travels, and its color. RUN_INPUT flows in (App→Hermes);
// Hermes output streams back (Hermes→App); AG-UI lifecycle rides back from the
// server to the client.
function route(ev: TraceEvent): { from: number; to: number; color: string; src: NodeId; dst: NodeId } {
  const t = ev.type;
  if (t === "RUN_INPUT") return { from: X.app, to: X.hermes, color: "var(--copilot)", src: "app", dst: "hermes" };
  if (t === "RUN_ERROR") return { from: X.hermes, to: X.app, color: "var(--err)", src: "hermes", dst: "app" };
  if (t.startsWith("RUN_")) return { from: X.agui, to: X.app, color: "var(--copilot-2)", src: "agui", dst: "app" };
  return { from: X.hermes, to: X.app, color: "var(--hermes)", src: "hermes", dst: "app" };
}

interface Pulse { id: number; from: number; to: number; color: string; dur: number; }

const SPEEDS = [0.5, 1, 2, 4];

// A single message dot, animated with the Web Animations API so `left`
// interpolates reliably between percentages (CSS-var keyframes do not).
function PulseDot({ p, onDone }: { p: Pulse; onDone: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = el.animate(
      [
        { left: `${p.from}%`, opacity: 0, transform: "translate(-50%,-50%) scale(0.5)" },
        { offset: 0.14, opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
        { offset: 0.86, opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
        { left: `${p.to}%`, opacity: 0, transform: "translate(-50%,-50%) scale(0.6)" },
      ],
      { duration: p.dur, easing: "cubic-bezier(.45,0,.25,1)", fill: "forwards" },
    );
    anim.onfinish = () => onDone(p.id);
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={ref}
      className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 rounded-full"
      style={{ left: `${p.from}%`, background: p.color, boxShadow: `0 0 10px 2px ${p.color}`, opacity: 0 }}
    />
  );
}

export function FlowView({ events, isLive }: { events: TraceEvent[]; isLive: boolean }) {
  const ordered = useMemo(() => [...events].sort((a, b) => a.seq - b.seq), [events]);

  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [flash, setFlash] = useState<Partial<Record<NodeId, number>>>({});
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const pulseId = useRef(0);
  const idxRef = useRef(0);
  const liveLen = useRef(0);
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  const lastStep = useRef(0);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const removePulse = useCallback((id: number) => setPulses((p) => p.filter((x) => x.id !== id)), []);

  const spawn = useCallback((ev: TraceEvent) => {
    const r = route(ev);
    const id = ++pulseId.current;
    const dist = Math.abs(r.to - r.from);
    const dur = Math.max(500, dist * 13) / Math.max(0.5, speedRef.current);
    setPulses((p) => [...p.slice(-90), { id, from: r.from, to: r.to, color: r.color, dur }]);
    setFlash((f) => ({ ...f, [r.src]: id }));
    window.setTimeout(() => setFlash((f) => ({ ...f, [r.dst]: id })), dur * 0.88);
  }, []);

  // ---- Live mode: animate each newly arrived event ------------------------
  useEffect(() => {
    if (!isLive) return;
    if (ordered.length < liveLen.current) liveLen.current = 0; // new run
    for (let i = liveLen.current; i < ordered.length; i++) spawn(ordered[i]);
    liveLen.current = ordered.length;
    setIndex(ordered.length);
  }, [isLive, ordered, spawn]);

  // ---- Replay mode: a single rAF loop gated by a shared timestamp ref, so
  // even a duplicated loop (dev StrictMode) can't double-step the cursor. -----
  useEffect(() => {
    if (isLive) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!playingRef.current) { lastStep.current = performance.now(); return; }
      const period = Math.max(26, 70 / speedRef.current);
      const now = performance.now();
      if (now - lastStep.current < period) return;
      lastStep.current = now;
      const i = idxRef.current;
      if (i >= ordered.length) { setPlaying(false); return; }
      spawn(ordered[i]);
      idxRef.current = i + 1;
      setIndex(i + 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isLive, ordered, spawn]);

  // Reset when the selected run changes.
  useEffect(() => {
    idxRef.current = isLive ? ordered.length : 0;
    setIndex(idxRef.current);
    setPlaying(false);
    setPulses([]);
    liveLen.current = ordered.length;
  }, [ordered, isLive]);

  const restart = () => { setPulses([]); idxRef.current = 0; setIndex(0); setPlaying(true); };
  const scrub = (v: number) => { setPlaying(false); setPulses([]); idxRef.current = v; setIndex(v); };

  const current = ordered[Math.min(index, ordered.length - 1)];
  const done = !isLive && index >= ordered.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Legend */}
      <div className="flex items-center gap-4 border-b border-[var(--line)] px-5 py-2.5 chrome text-[var(--faint)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: "var(--copilot)" }} />
          request →
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: "var(--hermes)" }} />
          ← stream back
        </span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1.5" style={{ color: "var(--copilot-2)" }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full live-dot" style={{ background: "var(--copilot)", color: "var(--copilot)" }} />
            live
          </span>
        )}
      </div>

      {/* Graph stage — vertically centered in the pane */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Current event caption */}
        <div className="pointer-events-none absolute inset-x-0 top-6 text-center">
          {current && (
            <span className="rounded-full border border-[var(--line)] bg-[var(--panel-raised)] px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
              <span style={{ color: current.hop === "hermes" ? "var(--hermes)" : "var(--copilot-2)" }}>{current.type}</span>
              <span className="mx-1.5 text-[var(--faint)]">·</span>
              {isLive ? `${ordered.length} events` : `${Math.min(index, ordered.length)} / ${ordered.length}`}
            </span>
          )}
        </div>

        <div className="relative h-[180px] w-full max-w-4xl">
          {/* The rail */}
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2"
            style={{
              left: `${X.app}%`,
              right: `${100 - X.hermes}%`,
              background: "linear-gradient(90deg, var(--copilot), var(--copilot-2) 55%, var(--hermes))",
              opacity: 0.5,
            }}
          />

          {/* Pulses */}
          {pulses.map((p) => (
            <PulseDot key={p.id} p={p} onDone={removePulse} />
          ))}

          {/* Nodes */}
          {NODES.map((n) => (
            <div
              key={n.id}
              className="absolute top-1/2 flex w-[120px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${n.x}%` }}
            >
              <div
                key={`${n.id}-${flash[n.id] ?? 0}`}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${flash[n.id] ? "node-flash" : ""}`}
                style={{
                  ["--fc" as string]: n.color,
                  borderColor: `color-mix(in oklab, ${n.color} 45%, var(--line))`,
                  background: `color-mix(in oklab, ${n.color} 10%, var(--panel-raised))`,
                }}
              >
                {n.mark === "copilot" ? (
                  <CopilotKitMark size={26} />
                ) : n.mark === "hermes" ? (
                  <HermesMark size={26} />
                ) : (
                  <span className="text-lg" style={{ color: n.color }}>⇄</span>
                )}
              </div>
              <div className="text-center leading-tight">
                <div className="text-[13px] font-semibold" style={{ color: n.color }}>{n.label}</div>
                <div className="chrome text-[var(--faint)]">{n.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transport controls (replay only) */}
      {!isLive && (
        <div className="flex items-center gap-3 border-t border-[var(--line)] px-5 py-3">
          <button
            onClick={() => (done ? restart() : setPlaying((p) => !p))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel-raised)] text-[var(--text)] transition-colors hover:border-[var(--copilot)]"
            title={done ? "Restart" : playing ? "Pause" : "Play"}
          >
            {done ? "↺" : playing ? "❚❚" : "▶"}
          </button>
          <button
            onClick={restart}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel-raised)] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            title="Restart"
          >
            ↺
          </button>
          <input
            type="range"
            min={0}
            max={ordered.length}
            value={Math.min(index, ordered.length)}
            onChange={(e) => scrub(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-[var(--copilot)]"
          />
          <div className="flex overflow-hidden rounded-md border border-[var(--line)] text-[10px]">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-1 font-mono transition-colors"
                style={
                  speed === s
                    ? { background: "color-mix(in oklab, var(--copilot) 20%, var(--panel-raised))", color: "var(--text)" }
                    : { color: "var(--muted)" }
                }
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
