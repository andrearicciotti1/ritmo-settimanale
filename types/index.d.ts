/** The last seven_day reading the engine reported. */
export type Reading = {
  /** 0–100, how much of the weekly window is used. */
  pct: number
  /** ISO 8601, when the weekly window resets. */
  resetsAt: string
  /** $.clock.now() milliseconds of the reading. */
  at: number
}

/** First and last weekly percent seen on each local day of one window. */
export type DayMark = { start: number; last: number }

/** History of one weekly window, keyed by local day 'YYYY-MM-DD'. */
export type WindowLog = { resetsAt: string; days: Record<string, DayMark> }

declare module 'claude-code' {
  interface PluginState {
    'ritmo-settimanale': { reading: Reading | null; log: WindowLog | null }
  }
}
