import { existsSync } from "fs";

export function resolvePythonPath(): string {
  const configured = process.env.PYTHON_PATH?.trim();
  if (configured) {
    if (existsSync(configured)) {
      return configured;
    }
    if (configured === "python" || configured === "python3" || configured === "py") {
      return configured;
    }
  }
  return process.platform === "win32" ? "python" : "/usr/bin/python3";
}