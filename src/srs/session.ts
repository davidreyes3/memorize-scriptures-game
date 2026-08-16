// Session clock (docs/build.md §4.11). The full session controller — overrun tracking,
// "serve exactly one more item" — is stateful and belongs in a UI hook, out of scope for
// this pass. This is the pure arithmetic it's built on.
import { SESSION_MS } from "../game/types";

export function timeLeft(startedAt: number, now: number): number {
  return Math.max(0, SESSION_MS - (now - startedAt));
}

export function isOverrun(startedAt: number, now: number): boolean {
  return timeLeft(startedAt, now) <= 0;
}
