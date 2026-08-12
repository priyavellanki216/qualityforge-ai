import React from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canUpdateDefectStatus } from "@/lib/workspaceFlows";

export function ApiRunButton({ running, onRun }: { running: boolean; onRun: () => void }) {
  return <Button onClick={onRun} disabled={running} className="primary-button">{running ? <Loader2 className="spin" /> : <Play />} {running ? "Running…" : "Run request"}</Button>;
}

export function DefectStatusSelect({ status, onChange, onBlocked }: { status: string; onChange: (next: string) => void; onBlocked: () => void }) {
  return <select aria-label="Defect status" value={status} onChange={event => { const next = event.target.value; if (!canUpdateDefectStatus(status, next)) { onBlocked(); return; } onChange(next); }}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="reopened">Reopened</option><option value="closed">Closed</option></select>;
}
