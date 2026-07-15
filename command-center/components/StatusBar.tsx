"use client";

import { useEffect, useState } from "react";
import { getHealth, getDemoHealth } from "@/lib/api";
import { ServicePill, type PillState } from "./ServicePill";
import { HermesMark, CopilotKitMark } from "./Brand";

interface Pill {
  state: PillState;
  detail?: string;
}

const INITIAL: Pill = { state: "unknown", detail: "checking…" };

export function StatusBar() {
  const [agui, setAgui] = useState<Pill>(INITIAL);
  const [hermes, setHermes] = useState<Pill>(INITIAL);
  const [app, setApp] = useState<Pill>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const h = await getHealth();
        if (cancelled) return;
        setAgui({
          state: h.adapter.ok ? "ok" : "err",
          detail: h.adapter.version ? `v${h.adapter.version}` : "adapter",
        });
        setHermes({
          state: h.model.reachable ? "ok" : "err",
          detail: h.model.reachable ? h.model.model : h.model.detail || "unreachable",
        });
      } catch {
        if (cancelled) return;
        setAgui({ state: "err", detail: "unreachable" });
        setHermes({ state: "err", detail: "unreachable" });
      }
      try {
        const d = await getDemoHealth();
        if (cancelled) return;
        setApp({ state: d.ok ? "ok" : "err", detail: d.ok ? "online" : "down" });
      } catch {
        if (cancelled) return;
        setApp({ state: "err", detail: "unreachable" });
      }
    }

    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const allOk = agui.state === "ok" && hermes.state === "ok" && app.state === "ok";

  return (
    <header>
      <div className="powerrail" />
      <div className="glass flex items-center gap-4 border-b border-[var(--line)] px-5 py-3">
        {/* Wordmark lockup */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <HermesMark size={20} />
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--hermes)" }}>
              Hermes
            </span>
          </div>
          <span className="text-[var(--faint)]">⇄</span>
          <div className="flex items-center gap-2">
            <CopilotKitMark size={20} />
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--copilot-2)" }}>
              CopilotKit
            </span>
          </div>
          <span className="ml-2 hidden border-l border-[var(--line)] pl-3 chrome text-[var(--faint)] sm:inline">
            Command Center
          </span>
        </div>

        {/* System summary + readouts */}
        <div className="ml-auto flex items-center gap-2.5">
          <span className="mr-1 hidden items-center gap-1.5 chrome md:flex" style={{ color: allOk ? "var(--ok)" : "var(--warn)" }}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: allOk ? "var(--ok)" : "var(--warn)", boxShadow: `0 0 6px ${allOk ? "var(--ok)" : "var(--warn)"}` }}
            />
            {allOk ? "nominal" : "degraded"}
          </span>
          <ServicePill label="AG-UI Server" brand="copilot" state={agui.state} detail={agui.detail} />
          <ServicePill label="CopilotKit App" brand="copilot" mark={<CopilotKitMark size={16} />} state={app.state} detail={app.detail} />
          <ServicePill label="Hermes" brand="hermes" mark={<HermesMark size={16} />} state={hermes.state} detail={hermes.detail} />
        </div>
      </div>
    </header>
  );
}
