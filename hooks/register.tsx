import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { DayMark, Reading, WindowLog } from '../types'

const PANE = 'ritmo-settimanale'
const DAY = 86_400_000
const WEEK = 7 * DAY
const TOLERANCE = 3 // punti percentuali di scarto considerati "in linea"

const reading = atom({ plugin: 'ritmo-settimanale', key: 'reading' } as const, null)
const log = atom({ plugin: 'ritmo-settimanale', key: 'log' } as const, null)

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

// ---------- calcoli ----------

function dayKey(ms: number): string {
  const d = new Date(ms)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

function midnight(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pct1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('it-IT')

type Pace = {
  used: number
  ideal: number
  ahead: number
  start: number
  end: number
  now: number
  usedToday: number
  budgetToday: number
  perDayFromNow: number
  daysLeft: number
  tone: 'ok' | 'warn' | 'bad' | 'spare'
  verdict: string
}

function pace(r: Reading, w: WindowLog | null, now: number): Pace | null {
  const end = Date.parse(r.resetsAt)
  if (!Number.isFinite(end)) return null
  const start = end - WEEK
  const used = r.pct
  const ideal = clamp((now - start) / WEEK, 0, 1) * 100
  const ahead = used - ideal

  const dayStart = Math.max(midnight(now), start)
  const dayEnd = Math.min(midnight(now) + DAY, end)
  const mark = w && w.resetsAt === r.resetsAt ? w.days[dayKey(now)] : undefined
  const startPct = mark ? mark.start : used
  const leftFromDayStart = Math.max(1, end - dayStart)
  const budgetToday = Math.max(0, 100 - startPct) * ((dayEnd - dayStart) / leftFromDayStart)
  const usedToday = Math.max(0, used - startPct)
  const daysLeft = Math.max(0, (end - now) / DAY)
  const perDayFromNow = daysLeft > 0 ? Math.max(0, 100 - used) / Math.max(daysLeft, 1 / 24) : 0

  let tone: Pace['tone'] = 'ok'
  let verdict = 'in linea con il ritmo'
  if (used >= 100) {
    tone = 'bad'
    verdict = 'limite settimanale raggiunto'
  } else if (ahead > TOLERANCE * 3) {
    tone = 'bad'
    verdict = `avanti di ${pct1(ahead)} punti: rallenta`
  } else if (ahead > TOLERANCE) {
    tone = 'warn'
    verdict = `un po' avanti (+${pct1(ahead)})`
  } else if (ahead < -TOLERANCE) {
    tone = 'spare'
    verdict = `hai margine (${pct1(ahead)})`
  }

  return { used, ideal, ahead, start, end, now, usedToday, budgetToday, perDayFromNow, daysLeft, tone, verdict }
}

const COLORS = { ok: '#30a46c', warn: '#f5a524', bad: '#e5484d', spare: '#3e8ef7' }
const MUTED = '#8b8d98'

function resetText(end: number): string {
  const d = new Date(end)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${GIORNI[d.getDay()]} ${d.getDate()} alle ${h}:${m}`
}

// ---------- disegni SVG ----------

function bandSvg(p: Pace): string {
  const W = 220
  const H = 14
  const fill = clamp(p.used, 0, 100) / 100 * W
  const tick = clamp(p.ideal, 0, 100) / 100 * W
  const c = COLORS[p.tone]
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect x="0" y="3" width="${W}" height="8" rx="4" fill="${MUTED}" fill-opacity="0.25"/>` +
    `<rect x="0" y="3" width="${fill.toFixed(1)}" height="8" rx="4" fill="${c}"/>` +
    `<rect x="${(tick - 1).toFixed(1)}" y="0" width="2" height="${H}" rx="1" fill="${MUTED}"/>` +
    `</svg>`
  )
}

function chartSvg(p: Pace, w: WindowLog | null): string {
  const W = 560
  const H = 260
  const L = 40
  const R = 16
  const T = 16
  const B = 34
  const pw = W - L - R
  const ph = H - T - B
  const x = (t: number) => L + clamp((t - p.start) / WEEK, 0, 1) * pw
  const y = (v: number) => T + (1 - clamp(v, 0, 100) / 100) * ph
  const font = `font-family="-apple-system,'Segoe UI',system-ui,sans-serif" font-size="11" fill="${MUTED}"`
  const c = COLORS[p.tone]
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`

  // griglia orizzontale
  for (const v of [0, 25, 50, 75, 100]) {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${MUTED}" stroke-opacity="0.18"/>`
    s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" ${font}>${v}%</text>`
  }
  // giorni
  for (let i = 0; i <= 7; i++) {
    const t = p.start + i * DAY
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${T + ph}" stroke="${MUTED}" stroke-opacity="0.12"/>`
    if (i < 7) {
      const d = new Date(t + DAY / 2)
      s += `<text x="${x(t + DAY / 2)}" y="${H - 12}" text-anchor="middle" ${font}>${GIORNI[d.getDay()]} ${d.getDate()}</text>`
    }
  }
  // ritmo ideale
  s += `<line x1="${x(p.start)}" y1="${y(0)}" x2="${x(p.end)}" y2="${y(100)}" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="5 4"/>`

  // consumo reale: inizio di ogni giorno registrato + adesso
  const pts: Array<[number, number]> = []
  if (w) {
    for (const [k, m] of Object.entries(w.days).sort()) {
      const [yy = 0, mm = 1, dd = 1] = k.split('-').map(Number)
      const t = Math.max(new Date(yy, mm - 1, dd).getTime(), p.start)
      pts.push([t, m.start])
    }
  }
  pts.push([p.now, p.used])
  if (pts.length === 1) pts.unshift([p.start, 0])
  const line = pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${x(pts[0]?.[0] ?? p.start).toFixed(1)},${y(0)} ${line} ${x(p.now).toFixed(1)},${y(0)}`
  s += `<polygon points="${area}" fill="${c}" fill-opacity="0.14"/>`
  s += `<polyline points="${line}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`

  // obiettivo di fine giornata
  const dayEnd = Math.min(midnight(p.now) + DAY, p.end)
  const target = p.used - p.usedToday + p.budgetToday
  s += `<line x1="${x(p.now)}" x2="${x(dayEnd)}" y1="${y(target)}" y2="${y(target)}" stroke="${c}" stroke-width="2" stroke-dasharray="2 3"/>`
  s += `<text x="${Math.min(x(dayEnd), W - R)}" y="${y(target) - 6}" text-anchor="end" ${font}>fine oggi ≤ ${pct1(target)}%</text>`

  // adesso
  s += `<circle cx="${x(p.now)}" cy="${y(p.used)}" r="4.5" fill="${c}"/>`
  s += `</svg>`
  return s
}

// ---------- registrazione ----------

async function record($: EngineInterface, limits: SessionRateLimit[]) {
  // ultima lettura di tutti i limiti: la legge anche lo screensaver MU/TH/UR
  if (limits.length) {
    await $.store.set('now', {
      at: await $.clock.now(),
      limits: limits.map(l => ({ kind: l.kind, pct: l.percentUsed, resetsAt: l.resetsAt ?? null })),
    })
  }
  const week = limits.find(l => l.kind === 'seven_day')
  if (!week || !week.resetsAt) return
  const now = await $.clock.now()
  const r: Reading = { pct: week.percentUsed, resetsAt: week.resetsAt, at: now }

  // storico condiviso tra le sessioni, in $.store
  const key = `win:${r.resetsAt}`
  const saved = ((await $.store.get(key)) as WindowLog | undefined) ?? { resetsAt: r.resetsAt, days: {} }
  const k = dayKey(now)
  const prev: DayMark | undefined = saved.days[k]
  saved.days[k] = { start: prev ? Math.min(prev.start, r.pct) : r.pct, last: r.pct }
  await $.store.set(key, saved)

  // tieni solo le ultime due settimane
  const keys = (await $.store.keys()).filter(x => x.startsWith('win:')).sort()
  for (const old of keys.slice(0, Math.max(0, keys.length - 2))) await $.store.delete(old)

  await update($, log, () => saved)
  await update($, reading, () => r)

  const p = pace(r, saved, now)
  if (p) $.ui.status(`Settimana ${pct1(p.used)}% · oggi ${pct1(p.usedToday)}/${pct1(p.budgetToday)}%`)
}

async function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Ritmo settimanale' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ritmo',
      description: 'Grafico del consumo settimanale e quota di oggi',
    })
    const usage = await $.session.usage()
    await record($, usage.rateLimits)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await record($, e.rateLimits)
    return next(e)
  })

  on('command.run', { command: 'ritmo' }, async $ => {
    await record($, (await $.session.usage()).rateLimits)
    const r = await read($, reading)
    await openPane($)
    if (!r) return { text: 'Nessuna lettura del limite settimanale ancora: arriva dopo la prima risposta (solo con abbonamento).' }
    const p = pace(r, await read($, log), await $.clock.now())
    if (!p) return { text: 'Lettura del limite non valida.' }
    return {
      text:
        `Settimana: ${pct1(p.used)}% usato, ritmo ideale ${pct1(p.ideal)}% (${p.verdict}).\n` +
        `Oggi: ${pct1(p.usedToday)}% su ${pct1(p.budgetToday)}% disponibili.\n` +
        `Da qui al reset (${resetText(p.end)}): ${pct1(p.perDayFromNow)}% al giorno.`,
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, reading)
    if (e.props.hasSurvey || !r) return next(e)
    const p = pace(r, await read($, log), await $.clock.now())
    if (!p) return next(e)
    const ui = $.ui.resolve(e) as Record<string, any>
    const { Box, Text, Button } = ui
    const Svg = ui.Svg
    const c = COLORS[p.tone]
    const label = `Settimana ${pct1(p.used)}% (ideale ${pct1(p.ideal)}%) · oggi ${pct1(p.usedToday)} di ${pct1(p.budgetToday)}% · ${p.verdict}`
    const blocks = 20
    const filled = Math.round(clamp(p.used, 0, 100) / 100 * blocks)
    const bar = '█'.repeat(filled) + '░'.repeat(blocks - filled)

    return (
      <Box flexDirection="row" gap={1} alignItems="center">
        {Svg ? (
          <Svg source={bandSvg(p)} alt={`Limite settimanale ${pct1(p.used)}%, ritmo ideale ${pct1(p.ideal)}%`} width={220} height={14} />
        ) : (
          <Text color={c}>{bar}</Text>
        )}
        <Text dimColor>{label}</Text>
        {Button && <Button key="grafico" label="Grafico" onPress={() => openPane($)} />}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e) as Record<string, any>
    const { Box, Text } = ui
    const Svg = ui.Svg
    const r = await read($, reading)
    if (!r) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Nessuna lettura del limite settimanale ancora.</Text>
          <Text dimColor>Arriva dopo la prima risposta di Claude (solo con abbonamento).</Text>
        </Box>
      )
    }
    const w = await read($, log)
    const p = pace(r, w, await $.clock.now())
    if (!p) return <Text dimColor>Lettura del limite non valida.</Text>
    const c = COLORS[p.tone]

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={c}>{p.verdict}</Text>
        <Text>
          Usato {pct1(p.used)}% · ritmo ideale {pct1(p.ideal)}% · reset {resetText(p.end)}
        </Text>
        <Text>
          Oggi: {pct1(p.usedToday)}% su {pct1(p.budgetToday)}% · da qui in poi {pct1(p.perDayFromNow)}% al giorno
        </Text>
        {Svg ? (
          <Svg source={chartSvg(p, w)} alt="Grafico del consumo settimanale contro il ritmo ideale" width={560} height={260} />
        ) : (
          <Text dimColor>(grafico disponibile nell'app desktop)</Text>
        )}
        <Text dimColor>
          Linea tratteggiata: ritmo ideale per arrivare al 100% al reset. Colore: verde in linea, blu margine, giallo/rosso avanti.
        </Text>
      </Box>
    )
  })
}
