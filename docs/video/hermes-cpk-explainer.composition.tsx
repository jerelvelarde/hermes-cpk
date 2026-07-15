/*
 * ============================================================================
 *  REMOTION COMPOSITION STARTER — NOT INSTALLED
 * ============================================================================
 *
 *  Video: hermes-cpk-explainer (ag-ui-explainer, 48s @ 30fps, 9:16)
 *  Brief: docs/video/hermes-cpk-explainer-brief.md
 *  Source template: .claude/skills/remotion-video/assets/composition.template.tsx
 *
 *  This file is STARTER CODE produced by the `remotion-video` skill. It is NOT
 *  installed into any Next.js `app/` directory and does NOT run in this repo as-is.
 *  Copy it into `app/remotion/HermesCpkExplainer.tsx` ONLY when the engineering
 *  ticket in `.claude/skills/remotion-video/references/remotion-integration.md`
 *  lands and Remotion + its CLI + bundler are added to that app's package.json.
 *
 *  Still TODO before render: the two browser-capture assets (see BROWSER_* below)
 *  and the canonical close-CTA URL. Everything else (copy, code, timing, subtitles)
 *  is filled from the brief.
 *
 *  Frame math @ 30fps: 3s=90 · 5s=150 · 7s=210 · 10s=300 · 48s=1440.
 *  Every animated value is frame-driven via interpolate()/useCurrentFrame() —
 *  never a CSS transition (Remotion seeks frames in parallel; CSS transitions flicker).
 * ============================================================================
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const FPS = 30;
const TOTAL_DURATION_IN_FRAMES = 1440; // 48s — matches brief Section 4

// All target surfaces are 9:16 (X + LinkedIn; Shorts reuses X).
const DIMENSIONS = {
  X_9X16: { width: 1080, height: 1920 },
  LINKEDIN_9X16: { width: 1080, height: 1920 },
} as const;

// Scene durations in frames, copied from the brief's outline. Sum = 1440.
const SCENE_DURATIONS = {
  TITLE_CARD: 90, // 3s
  TERMINAL: 150, // 5s
  CODE_WIRING: 300, // 10s
  BROWSER_SELF_EDIT: 300, // 10s
  BROWSER_FLOW: 300, // 10s
  CODE_REUSE: 210, // 7s
  CLOSE_CTA: 90, // 3s
} as const;

// Cumulative start frames (kept explicit so the outline is auditable).
const START = {
  TITLE_CARD: 0,
  TERMINAL: 90,
  CODE_WIRING: 240,
  BROWSER_SELF_EDIT: 540,
  BROWSER_FLOW: 840,
  CODE_REUSE: 1140,
  CLOSE_CTA: 1350,
} as const;

// Brand palette — CopilotKit indigo × Hermes gold (the demo's co-brand).
const BRAND = {
  BG: "#07080e",
  FG: "#e7eaf5",
  MUTED: "#838ca6",
  COPILOT: "#6366f1", // CopilotKit indigo
  HERMES: "#ffce4a", // Hermes / Nous gold
  MONO: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  SANS: "'Inter', system-ui, -apple-system, sans-serif",
} as const;

// ---------------------------------------------------------------------------
//  Scene components
// ---------------------------------------------------------------------------

const TitleCard: React.FC<{ headline: string; subline?: string }> = ({ headline, subline }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.BG,
        color: BRAND.FG,
        fontFamily: BRAND.SANS,
        justifyContent: "center",
        alignItems: "center",
        padding: 96,
        opacity,
      }}
    >
      <h1 style={{ fontSize: 104, fontWeight: 700, textAlign: "center", margin: 0, lineHeight: 1.1 }}>
        {headline}
      </h1>
      {subline ? (
        <p style={{ fontSize: 40, marginTop: 32, textAlign: "center" }}>
          <span style={{ color: BRAND.HERMES }}>☤ Hermes</span>
          <span style={{ color: BRAND.MUTED }}> × </span>
          <span style={{ color: BRAND.COPILOT }}>CopilotKit</span>
          <span style={{ color: BRAND.MUTED }}> over AG-UI</span>
        </p>
      ) : null}
    </AbsoluteFill>
  );
};

const TerminalCap: React.FC<{ command: string; output: string }> = ({ command, output }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  // Command "types in" over frames 10–60; output fades in after Enter (frame 70+).
  const typed = Math.floor(interpolate(frame, [10, 60], [0, command.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const outOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.BG, justifyContent: "center", alignItems: "center", opacity }}>
      <div
        style={{
          width: "82%",
          backgroundColor: "#0b0f14",
          border: `1px solid #1b2530`,
          borderRadius: 16,
          padding: 40,
          fontFamily: BRAND.MONO,
          fontSize: 34,
          color: BRAND.FG,
        }}
      >
        <div>
          <span style={{ color: BRAND.HERMES }}>$ </span>
          {command.slice(0, typed)}
        </div>
        <div style={{ marginTop: 24, color: BRAND.MUTED, opacity: outOpacity }}>{output}</div>
      </div>
    </AbsoluteFill>
  );
};

const CodeCut: React.FC<{ snippet: string; highlightLine: number; accent: string }> = ({ snippet, highlightLine, accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const hl = interpolate(frame, [30, 50, 70], [0, 1, 1], { extrapolateRight: "clamp" });
  const lines = snippet.split("\n");
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.BG,
        color: BRAND.FG,
        fontFamily: BRAND.MONO,
        justifyContent: "center",
        padding: 72,
        opacity,
      }}
    >
      <pre style={{ fontSize: 34, lineHeight: 1.5, margin: 0 }}>
        {lines.map((line, idx) => {
          const isHl = idx === highlightLine - 1;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: isHl ? `color-mix(in oklab, ${accent} ${hl * 16}%, transparent)` : "transparent",
                borderLeft: isHl ? `3px solid color-mix(in oklab, ${accent} ${hl * 100}%, transparent)` : "3px solid transparent",
                paddingLeft: 16,
              }}
            >
              {line || " "}
            </div>
          );
        })}
      </pre>
    </AbsoluteFill>
  );
};

const BrowserCapture: React.FC<{ caption: string; assetTodo: string; accent: string }> = ({ caption, assetTodo, accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 60], [1, 1.05], { extrapolateRight: "clamp" }); // signature motion
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.BG, opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          backgroundColor: "#101418",
          border: `2px solid ${accent}`,
          margin: 56,
          borderRadius: 16,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* TODO: replace with <Img src={staticFile(assetTodo)} /> or <Video> — see brief Section 9 */}
        <span style={{ fontSize: 30, color: BRAND.MUTED, fontFamily: BRAND.MONO }}>{assetTodo}</span>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 260,
          textAlign: "center",
          fontFamily: BRAND.SANS,
          fontSize: 40,
          color: BRAND.FG,
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          padding: "0 48px",
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
};

const CloseCta: React.FC<{ headline: string; line: string }> = ({ headline, line }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{ backgroundColor: BRAND.BG, justifyContent: "center", alignItems: "center", opacity, padding: 72 }}
    >
      <span style={{ fontFamily: BRAND.SANS, fontSize: 64, fontWeight: 700, color: BRAND.FG, textAlign: "center" }}>
        {headline}
      </span>
      <span style={{ marginTop: 28, fontFamily: BRAND.MONO, fontSize: 40, color: BRAND.COPILOT }}>{line}</span>
    </AbsoluteFill>
  );
};

const SubtitleBand: React.FC<{
  segments: Array<{ from: number; durationInFrames: number; text: string }>;
}> = ({ segments }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {segments.map((seg, idx) => (
      <Sequence key={idx} from={seg.from} durationInFrames={seg.durationInFrames}>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 140 }}>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              fontFamily: BRAND.SANS,
              fontSize: 38,
              lineHeight: 1.3,
              padding: "14px 28px",
              borderRadius: 10,
              maxWidth: "86%",
              textAlign: "center",
            }}
          >
            {seg.text}
          </div>
        </AbsoluteFill>
      </Sequence>
    ))}
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
//  Main composition
// ---------------------------------------------------------------------------

const WIRING_SNIPPET = `// app/api/copilotkit/route.ts
const runtime = new CopilotRuntime({
  agents: {
    // The whole integration: point CopilotKit at Hermes.
    default: new HermesAgent({ url: process.env.AGENT_URL }),
  },
});`;

const REUSE_SNIPPET = `# Any CopilotKit app connects the same way —
# just point the adapter at that app's folder:
AGENT_URL=http://localhost:8000   # in the app
./run-adapter.sh my-other-app     # Hermes, from that dir`;

export const VideoComposition: React.FC = () => {
  const { fps } = useVideoConfig();
  if (fps !== FPS) {
    // eslint-disable-next-line no-console
    console.warn(`Expected ${FPS}fps but received ${fps}fps — update Root.tsx.`);
  }

  const subtitleSegments = [
    { from: START.TITLE_CARD, durationInFrames: SCENE_DURATIONS.TITLE_CARD, text: "Connect an agent to your app." },
    { from: START.TERMINAL, durationInFrames: SCENE_DURATIONS.TERMINAL, text: "Hermes runs on your machine and speaks AG-UI." },
    { from: START.CODE_WIRING, durationInFrames: SCENE_DURATIONS.CODE_WIRING, text: "The whole integration: point CopilotKit at Hermes. No custom bridge." },
    { from: START.BROWSER_SELF_EDIT, durationInFrames: SCENE_DURATIONS.BROWSER_SELF_EDIT, text: "Chat in the app — the same agent edits the app's own code, live." },
    { from: START.BROWSER_FLOW, durationInFrames: SCENE_DURATIONS.BROWSER_FLOW, text: "Nothing to rebuild. Watch every message flow to Hermes and back." },
    { from: START.CODE_REUSE, durationInFrames: SCENE_DURATIONS.CODE_REUSE, text: "New app? Same one line. The integration never changes." },
    { from: START.CLOSE_CTA, durationInFrames: SCENE_DURATIONS.CLOSE_CTA, text: "Build it: Hermes × CopilotKit." },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.BG }}>
      {/* Scene 1 — title-card */}
      <Sequence from={START.TITLE_CARD} durationInFrames={SCENE_DURATIONS.TITLE_CARD}>
        <TitleCard headline={"Connect an agent to your app. No glue code."} subline="brand" />
      </Sequence>

      {/* Scene 2 — terminal-cap */}
      <Sequence from={START.TERMINAL} durationInFrames={SCENE_DURATIONS.TERMINAL}>
        <TerminalCap
          command={"./run-adapter.sh expense-tracker-live"}
          output={"Hermes AG-UI adapter · workspace: expense-tracker-live · listening http://127.0.0.1:8000/"}
        />
      </Sequence>

      {/* Scene 3 — code-cut: the wiring */}
      <Sequence from={START.CODE_WIRING} durationInFrames={SCENE_DURATIONS.CODE_WIRING}>
        <CodeCut snippet={WIRING_SNIPPET} highlightLine={5} accent={BRAND.COPILOT} />
      </Sequence>

      {/* Scene 4 — browser-capture: self-edit */}
      <Sequence from={START.BROWSER_SELF_EDIT} durationInFrames={SCENE_DURATIONS.BROWSER_SELF_EDIT}>
        <BrowserCapture
          caption={"Financial Ledger recolors itself — with a diff you can Undo."}
          assetTodo={"<TODO: captures/financial-ledger-self-edit.mp4>"}
          accent={BRAND.COPILOT}
        />
      </Sequence>

      {/* Scene 5 — browser-capture: the flow graph */}
      <Sequence from={START.BROWSER_FLOW} durationInFrames={SCENE_DURATIONS.BROWSER_FLOW}>
        <BrowserCapture
          caption={"Command Center: the message pulses App → AG-UI → Hermes and back."}
          assetTodo={"<TODO: captures/command-center-flow.mp4>"}
          accent={BRAND.HERMES}
        />
      </Sequence>

      {/* Scene 6 — code-cut: reuse / no-rebuild */}
      <Sequence from={START.CODE_REUSE} durationInFrames={SCENE_DURATIONS.CODE_REUSE}>
        <CodeCut snippet={REUSE_SNIPPET} highlightLine={3} accent={BRAND.HERMES} />
      </Sequence>

      {/* Scene 7 — close-cta */}
      <Sequence from={START.CLOSE_CTA} durationInFrames={SCENE_DURATIONS.CLOSE_CTA}>
        <CloseCta headline={"Build it: Hermes × CopilotKit"} line={"<TODO: canonical URL — see brief §9>"} />
      </Sequence>

      {/* Baked-in subtitles — required for X + LinkedIn (autoplay muted) */}
      <SubtitleBand segments={subtitleSegments} />

      {/* Optional music bed — add the licensed track to public/ at integration time.
      <Audio
        src={staticFile("audio/ambient-bed.mp3")}
        volume={(f) => interpolate(f, [0, 30], [0, 0.6], { extrapolateRight: "clamp" })}
      />
      */}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
//  Root — one <Composition> per aspect-ratio variant (both 9:16)
// ---------------------------------------------------------------------------

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="hermes-cpk-explainer-x-9x16"
      component={VideoComposition}
      durationInFrames={TOTAL_DURATION_IN_FRAMES}
      fps={FPS}
      width={DIMENSIONS.X_9X16.width}
      height={DIMENSIONS.X_9X16.height}
    />
    <Composition
      id="hermes-cpk-explainer-linkedin-9x16"
      component={VideoComposition}
      durationInFrames={TOTAL_DURATION_IN_FRAMES}
      fps={FPS}
      width={DIMENSIONS.LINKEDIN_9X16.width}
      height={DIMENSIONS.LINKEDIN_9X16.height}
    />
  </>
);

// `staticFile` / `Audio` are imported for the future <Audio>/<Img> wiring.
void staticFile;
void Audio;
