import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = (value) => Math.max(0, Math.min(1, value));

const Button = ({label, accent, delay = 0, icon}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({fps, frame: frame - delay, config: {damping: 200, stiffness: 180, mass: 0.8}});
  const glow = interpolate(frame, [delay, delay + 18], [0.15, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        transform: `scale(${0.92 + scale * 0.08})`,
        opacity: clamp(scale * 1.2),
        width: 560,
        height: 148,
        borderRadius: 32,
        border: `1px solid ${accent}55`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 22px 80px rgba(0,0,0,0.30), 0 0 80px rgba(86,255,214,${glow})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 34px',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            background: `${accent}22`,
            border: `1px solid ${accent}66`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
          }}
        >
          {icon}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          <div style={{fontSize: 18, textTransform: 'uppercase', letterSpacing: 3, color: '#96A0BD'}}>Action</div>
          <div style={{fontSize: 42, fontWeight: 700, color: 'white'}}>{label}</div>
        </div>
      </div>
      <div
        style={{
          borderRadius: 999,
          padding: '14px 20px',
          fontSize: 20,
          fontWeight: 700,
          color: '#05101C',
          background: accent,
        }}
      >
        Ready
      </div>
    </div>
  );
};

const CheckBadge = ({label, accent, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({fps, frame: frame - delay, config: {damping: 16, stiffness: 160}});
  return (
    <div
      style={{
        transform: `translateY(${20 - 20 * pop}px) scale(${0.8 + pop * 0.2})`,
        opacity: clamp(pop * 1.2),
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 24px',
        borderRadius: 22,
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${accent}55`,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          background: accent,
          color: '#06111C',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          fontSize: 24,
        }}
      >
        ✓
      </div>
      <div style={{fontSize: 28, fontWeight: 600, color: 'white'}}>{label}</div>
    </div>
  );
};

const Connection = ({x1, y1, x2, y2, color, progress}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <div
      style={{
        position: 'absolute',
        left: x1,
        top: y1,
        width: length,
        height: 4,
        borderRadius: 999,
        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.15))`,
        transformOrigin: 'left center',
        transform: `rotate(${angle}deg) scaleX(${progress})`,
        boxShadow: `0 0 24px ${color}`,
      }}
    />
  );
};

const DiagramNode = ({title, subtitle, x, y, accent, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({fps, frame: frame - delay, config: {damping: 18, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 300,
        padding: '24px 26px',
        borderRadius: 28,
        background: 'rgba(12, 20, 37, 0.92)',
        border: `1px solid ${accent}66`,
        transform: `translateY(${26 - 26 * reveal}px) scale(${0.9 + reveal * 0.1})`,
        opacity: clamp(reveal * 1.2),
        boxShadow: `0 16px 40px rgba(0,0,0,0.25), 0 0 40px ${accent}22`,
      }}
    >
      <div style={{fontSize: 16, textTransform: 'uppercase', letterSpacing: 3, color: accent, marginBottom: 10}}>{subtitle}</div>
      <div style={{fontSize: 34, fontWeight: 700, color: 'white', lineHeight: 1.15}}>{title}</div>
    </div>
  );
};

export const DraftVideo = ({topic}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 18, 48], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const headlineShift = interpolate(frame, [0, 18], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const diagramProgress = interpolate(frame, [84, 118], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outroOpacity = interpolate(frame, [132, 154, 180], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.2);

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at top left, rgba(89, 126, 255, 0.35), transparent 35%), radial-gradient(circle at 80% 20%, rgba(53, 225, 187, 0.22), transparent 28%), linear-gradient(180deg, #040814 0%, #0A1022 45%, #0E1630 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        color: 'white',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          opacity: 0.16,
        }}
      />

      <div style={{position: 'absolute', inset: 0, padding: '88px 100px'}}>
        <div style={{opacity: headlineOpacity, transform: `translateY(${headlineShift}px)`, maxWidth: 1220}}>
          <div style={{fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', color: '#56FFD6', marginBottom: 18}}>
            Product QA walkthrough
          </div>
          <div style={{fontSize: 88, lineHeight: 1.03, fontWeight: 800, letterSpacing: -2.6}}>{topic}</div>
          <div style={{fontSize: 34, lineHeight: 1.35, color: '#B6C2E4', marginTop: 24, maxWidth: 1120}}>
            Confirm the Create Video and Diagram buttons feel obvious, responsive, and connected to a clean generation flow.
          </div>
        </div>

        <div style={{position: 'absolute', left: 104, top: 420, display: 'flex', flexDirection: 'column', gap: 26}}>
          <Button label="Create Video" accent="#56FFD6" delay={24} icon="▶" />
          <Button label="Create Diagram" accent="#7EA7FF" delay={34} icon="⬢" />
        </div>

        <div style={{position: 'absolute', right: 110, top: 426, display: 'flex', flexDirection: 'column', gap: 18}}>
          <CheckBadge label="Buttons clearly visible" accent="#56FFD6" delay={54} />
          <CheckBadge label="States react instantly" accent="#7EA7FF" delay={64} />
          <CheckBadge label="Output path is unambiguous" accent="#FFDA7B" delay={74} />
        </div>

        <div style={{opacity: clamp((frame - 84) / 12)}}>
          <DiagramNode title="Prompt" subtitle="Input" x={160} y={790} accent="#56FFD6" delay={88} />
          <DiagramNode title="Render" subtitle="Action" x={820} y={700} accent="#7EA7FF" delay={96} />
          <DiagramNode title="Poster + video" subtitle="Output" x={1380} y={790} accent="#FFDA7B" delay={104} />
          <Connection x1={460} y1={876} x2={820} y2={790} color="#56FFD6" progress={diagramProgress} />
          <Connection x1={1120} y1={790} x2={1380} y2={876} color="#7EA7FF" progress={diagramProgress} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 104,
            right: 104,
            bottom: 84,
            opacity: outroOpacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: '#FFDA7B', marginBottom: 14}}>
              Verification signal
            </div>
            <div style={{fontSize: 42, fontWeight: 700}}>Both buttons earn trust when the path from click to artifact is obvious.</div>
          </div>
          <div
            style={{
              width: 126,
              height: 126,
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.16)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 0 ${44 + pulse * 26}px rgba(86,255,214,0.32)`,
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #56FFD6, #7EA7FF)',
                color: '#04111E',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: 36,
              }}
            >
              ✓
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
