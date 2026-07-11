import { spawn } from "node:child_process";

export type ShellResult = { code: number | null; stdout: string; stderr: string };

export function sh(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<ShellResult> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let done = false;
    const finish = (code: number | null) => {
      if (done) return;
      done = true;
      resolve({ code, stdout, stderr });
    };
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          p.kill("SIGKILL");
          stderr += `\n[timeout after ${opts.timeoutMs}ms]`;
          finish(-2);
        }, opts.timeoutMs)
      : null;
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (e) => {
      if (timer) clearTimeout(timer);
      stderr += `\n${e.message}`;
      finish(-1);
    });
    p.on("close", (code) => {
      if (timer) clearTimeout(timer);
      finish(code);
    });
  });
}

export const npx = (args: string[], opts: Parameters<typeof sh>[2] = {}) =>
  sh("npx", ["-y", ...args], { ...opts, env: { ...(opts.env ?? process.env), CI: "1" } });
