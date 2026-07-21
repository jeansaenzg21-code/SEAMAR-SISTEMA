function fmtMs(ms: number): string {
  if (ms >= 60000) {
    const s = (ms / 1000).toFixed(1);
    return `${s} s`;
  }
  return `${Math.round(ms)} ms`;
}

export class DocTiming {
  public readonly docId: string;
  private phases: Map<string, { start: number; end?: number }> = new Map();

  constructor(docId: string) {
    this.docId = docId;
  }

  start(phase: string) {
    this.phases.set(phase, { start: performance.now() });
  }

  end(phase: string) {
    const p = this.phases.get(phase);
    if (p) p.end = performance.now();
  }

  elapsedMs(phase: string): number | null {
    const p = this.phases.get(phase);
    if (p && p.end) return p.end - p.start;
    return null;
  }

  log(resultado: string) {
    const lines: string[] = [];
    lines.push(`== Documento ${this.docId} ==`);
    for (const [phase, { start, end }] of this.phases) {
      if (end) {
        lines.push(`  ${phase}: ${fmtMs(end - start)}`);
      }
    }
    lines.push(`  Resultado: ${resultado}`);
    console.log(lines.join("\n"));
  }
}
