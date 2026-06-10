import { spawn } from 'child_process';

export type ClaudeOptions = { model?: string; timeoutMs?: number };

// Drives the locally-installed, locally-authenticated Claude Code CLI in print
// mode — no API key required. Prompt is piped via stdin to avoid arg limits.
export const askClaude = (
  prompt: string,
  options: ClaudeOptions = {},
): Promise<string | null> =>
  new Promise((resolve) => {
    const child = spawn(
      'claude',
      ['-p', '--model', options.model ?? 'haiku', '--no-session-persistence'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    let out = '';
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(null);
    }, options.timeoutMs ?? 60000);

    child.stdout.on('data', (chunk) => {
      out += chunk as string;
    });
    child.on('error', () => finish(null));
    child.on('close', (code) => finish(code === 0 ? out.trim() : null));

    child.stdin.write(prompt);
    child.stdin.end();
  });
