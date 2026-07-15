#!/usr/bin/env python3
"""Drive the running Hermes AG-UI adapter with a single prompt (one run).

Sends an AG-UI RunAgentInput to POST / and streams the event log to stdout:
assistant text, tool calls (with the files Hermes touches), and the terminal
RUN_FINISHED / RUN_ERROR. This is the same seam CopilotKit uses — we just call
it directly so we can validate a build/edit run headlessly.

Usage:
    python drive-hermes.py "your prompt"            # prompt inline
    python drive-hermes.py --file BUILD-PROMPT.txt  # prompt from file
    python drive-hermes.py ... --url http://127.0.0.1:8000/
"""
from __future__ import annotations
import argparse, json, sys, uuid
import httpx


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt", nargs="?", default=None)
    ap.add_argument("--file")
    ap.add_argument("--url", default="http://127.0.0.1:8000/")
    ap.add_argument("--timeout", type=float, default=1800.0)
    args = ap.parse_args()

    prompt = args.prompt
    if args.file:
        with open(args.file) as fh:
            prompt = fh.read()
    if not prompt:
        print("no prompt given", file=sys.stderr)
        return 2

    payload = {
        "threadId": f"t_{uuid.uuid4().hex[:12]}",
        "runId": f"r_{uuid.uuid4().hex[:12]}",
        "state": {},
        "messages": [{"id": f"m_{uuid.uuid4().hex[:12]}", "role": "user", "content": prompt}],
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }

    status = 1
    open_tool = {}
    with httpx.Client(timeout=args.timeout) as client:
        with client.stream("POST", args.url, json=payload,
                           headers={"Accept": "text/event-stream"}) as resp:
            if resp.status_code != 200:
                print(f"HTTP {resp.status_code}: {resp.read().decode(errors='replace')}", file=sys.stderr)
                return 1
            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                try:
                    ev = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                t = ev.get("type")
                if t == "RUN_STARTED":
                    print("▶ run started")
                elif t == "TEXT_MESSAGE_CONTENT":
                    sys.stdout.write(ev.get("delta", "")); sys.stdout.flush()
                elif t == "TEXT_MESSAGE_END":
                    print()
                elif t == "TOOL_CALL_START":
                    tid = ev.get("toolCallId")
                    open_tool[tid] = {"name": ev.get("toolCallName", "?"), "args": ""}
                    print(f"\n🔧 {open_tool[tid]['name']}(", end="")
                elif t == "TOOL_CALL_ARGS":
                    tid = ev.get("toolCallId")
                    if tid in open_tool:
                        open_tool[tid]["args"] += ev.get("delta", "")
                elif t == "TOOL_CALL_END":
                    tid = ev.get("toolCallId")
                    a = open_tool.get(tid, {}).get("args", "")
                    # Surface just the path/command so the log is readable.
                    hint = ""
                    try:
                        d = json.loads(a) if a else {}
                        hint = d.get("path") or d.get("file_path") or d.get("command") or ""
                    except json.JSONDecodeError:
                        hint = a[:60]
                    print(f"{hint})")
                elif t == "RUN_FINISHED":
                    print("\n✅ RUN_FINISHED")
                    status = 0
                elif t == "RUN_ERROR":
                    print(f"\n❌ RUN_ERROR: {ev.get('message')}", file=sys.stderr)
                    status = 1
    return status


if __name__ == "__main__":
    raise SystemExit(main())
