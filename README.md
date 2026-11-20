# Domino Sky: Flight Disruption Cascade & Recovery Simulator

**Domino Sky** is an interactive, deterministic flight network disruption and recovery simulator with an AI Dispatcher layer powered by Google Gemini.

When an airport closes for 90 minutes, it does not just delay flights at that single airfield. Because each aircraft flies a tightly scheduled chain of flights throughout the operating day, holding one aircraft propagates delays to later flights across the entire country—even in cities with completely clear skies. Inbound delays squeeze minimum turnaround times, break connecting passenger itineraries, and push flight crews past their legal duty limits (forcing emergency cancellations).

Domino Sky visualizes **which** flights are late, **why** they are late, **how many** passengers are stranded, and how **AI-guided recovery actions** (selective cancellations or spare aircraft swaps) resolve the cascade.

---

## 1. System Architecture & Data Flow

```text
               ┌────────────────────────────────────────────────────────┐
               │                  User Control Room                     │
               │   • Closure Slider / Map Click (Up to 3 Closures)      │
               │   • Time Scrubber (00:00 - 24:00, 1x/4x/16x Playback)  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Pure TypeScript Deterministic Engine                           │
│                                (src/engine/)                                          │
│                                                                                        │
│  1. Single Forward Pass (Sorted by Sched Dep)                                         │
│     earliest_dep = max(sched_dep, prev_arr + 30m turnaround)                          │
│     Ground Hold: if origin closed at earliest_dep => dep = closure_end                │
│     In-Air Hold: if dest closed at actual_arr   => arr = closure_end                  │
│                                                                                        │
│  2. Legal Crew Duty Convergence Loop (max 5 rounds)                                    │
│     duty = last_flight.actual_arr - duty_start                                        │
│     if duty > 600m => cancel overflow flights, re-run forward pass                    │
│                                                                                        │
│  3. Connection Evaluator (< 45 min min connect => broken connection)                  │
│                                                                                        │
│  4. Deterministic Recovery Enumerator (~100 candidate actions evaluated in < 70ms)    │
│     Rank top 3: (stranded_pax ASC, delay_minutes ASC, cancellations ASC)              │
└───────────────────────────┬──────────────────────────────────┬────────────────────────┘
                            │                                  │
          Precomputed       │                                  │ Evaluated Top 3 Actions
          Simulation Result │                                  │ Before/After KPIs
                            ▼                                  ▼
               ┌────────────────────────────────────────────────────────┐
               │              Backend Dispatcher Service                │
               │                   (/api/dispatch)                      │
               │                                                        │
               │  • Per-IP Sliding Rate Limiter (10 req/min)            │
               │  • 256KB Payload Ceiling & Content-Type Enforcement    │
               │  • Strict Schema Validation (Disallow Unknown Fields)  │
               │  • Strict CSP, HSTS, Anti-Sniff & Anti-Framing Headers │
               │  • Google Gemini SDK (@google/genai, temp: 0.2)        │
               │  • Strict Number & ID Cross-Validator vs ResultJSON   │
               │  • Deterministic Verified Fallback Template            │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Reactive React 19 UI                                     │
│  • Skip-to-Content & ARIA Live polite announcements for screen readers                 │
│  • Projected SVG India map with active flight arcs and weather clouds                  │
│  • 16-tail Gantt chart with 40ms domino tipping animation & causal linking             │
│  • Side drawer with vertical causal chain & accessible focus trap                      │
│  • Full Table View modal, 1-Hour Hub Sensitivity Matrix, and Printable Incident Report │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Highlights & Hard Rules

- **100% Deterministic Engine**: All delay minutes, cancellation decisions, crew duty limits, and passenger numbers come from pure TypeScript algorithms (`src/engine/`).
- **AI Explains & Recommends (Never Computes)**: The Google Gemini integration (`@google/genai`) only interprets precomputed engine results.
- **Strict Number & Option Validator**: Every number cited by Gemini in the summary, rationale, and caveats is cross-checked against the simulation `ResultJSON`. Any hallucinated or mismatched number triggers a retry or falls back to a verified deterministic template.
- **Enterprise Security**: 256 KB payload limit, 10 req/min rate limiter, strict schema validation, defensive security headers (CSP, nosniff, DENY framing), zero secret leaks in client bundles, and full threat model documented in [`SECURITY.md`](SECURITY.md).
- **Control-Room Design**: Calm control-room aesthetic (`#F7F8FA` background, `#FFFFFF` cards, Inter and JetBrains Mono tabular typography), zero remote tile maps, and SVG rendering.
- **Full WCAG Accessibility**: Accessible skip link, dual range slider keyboard controls (`Home`, `End`, `PageUp`, `PageDown`), `aria-live="polite"` simulation updates, `aria-modal` dialogs with focus trapping and focus restoration, and minimum 44px touch envelopes.

---

## 3. Deterministic Simulation Rules

Flights are sorted by scheduled departure time (ties broken by `flight_id`):

1. **Turnaround & Earliest Departure**:
   $$\text{earliest\_dep} = \max(\text{scheduled\_dep}, \text{actual\_arr}_{\text{prev}} + \text{min\_turnaround})$$
   If turnaround won, the dominant cause is tagged as `aircraft_knock_on` pointing to the inbound flight ID.
2. **Origin Airfield Closure**:
   If the departure airport is closed at $\text{earliest\_dep}$, the departure is held until reopening:
   $$\text{dep} = \text{closure\_end}$$
   The dominant cause becomes `closure_hold` pointing to the origin airport. Up to 3 simultaneous closures are supported.
3. **Destination Closure & In-Air Holding**:
   $$\text{actual\_arr} = \text{dep} + \text{block\_minutes}$$
   If the destination airport is closed at $\text{actual\_arr}$, the aircraft holds until $\text{closure\_end}$.
4. **Connections & Non-Duplicated Stranded Passengers**:
   A connection is missed if:
   $$\text{actual\_dep}_{\text{to\_flight}} - \text{actual\_arr}_{\text{from\_flight}} < \text{min\_connect\_minutes}$$
   or if either flight is cancelled. Stranded passengers on cancelled flights and missed connections are counted without double-counting.
5. **Crew Legal Duty Hours**:
   $$\text{duty} = \text{last\_flight.actual\_arr} - \text{duty\_start}$$
   If $\text{duty} > 600\text{ min}$, the crew times out. Flights that cannot legally be flown are cancelled (`crew_limit`), freeing the aircraft. The forward pass is re-run until stable (converges in $\le 5$ rounds).

---

## 4. Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# 1. Clone repository & install dependencies
npm install

# 2. Configure environment (optional, for Gemini AI dispatcher)
cp .env.example .env
```
In `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
*(Note: If no API key is provided, the simulator automatically uses verified deterministic engine templates, keeping 100% of the UI and simulation fully functional.)*

### Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Starts Vite dev server with `/api/dispatch` middleware |
| `npm run test` | `vitest run` | Runs all 47 unit, property, and edge-case tests |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript compiler validation |
| `npm run check` | `tsc --noEmit && vitest run && vite build` | Unified pipeline check |
| `npm run build` | `tsc && vite build` | Generates optimized production distribution |
| `npm run preview` | `vite preview` | Serves production build locally |

---

## 5. Test Suite (47/47 Passing Tests)

The test suite covers full simulation correctness, invariants, edge cases, and API security:
- `tests/engine.test.ts`: Zero closure baseline equivalence and 3 hand-calculated validation scenarios.
- `tests/recovery.test.ts`: Spare swap eligibility rules and deterministic candidate ranking.
- `tests/dataValidator.test.ts`: Structural integrity of `flight_network.json` (tails, legs, routes, connections).
- `tests/aiValidator.test.ts`: Number hallucination rejection, formatted number support, and option ID verification.
- `tests/edgeCases.test.ts`: Closures at 00:00 (start of day), 24:00 (end of day), 0-flight airports, and 600m/601m crew threshold boundaries.
- `tests/properties.test.ts`: 15 property-based tests verifying physical causality, non-negative delays, and passenger totals.
- `tests/apiHandler.test.ts`: HTTP status codes (405, 415, 400, 413, 429), strict schema rejections, and security headers.
- `tests/performance.test.ts`: Full-day simulation in < 2ms, and 100-action recovery enumeration in < 70ms.

---

## 6. Delight & Motion Details

- **The Signature Moment**: When an airport closure is applied, dominoes tip over along each affected aircraft rotation chain in the Gantt with a 40ms stagger from left to right, and delayed bars stretch rightward with an elastic ease.
- **Flight Arcs & Holding Loops**: Active flights display small paper planes banking along the route with trailing dots. Flights held on the ground loop gently over the closed airport.
- **Weather Clouds & Sun**: A low-contrast drifting rain cloud hovers over closed airports; a sun peeks out on reopening.
- **Audio Chime**: A soft synthesizer chime (pure Web Audio API, zero audio files) sounds when a recovery action is successfully applied.
- **Accessibility & Reduced Motion**: Automatically honors the system `prefers-reduced-motion` setting or in-app toggle, instantly switching all animations to instantaneous state transitions.

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause time scrubber simulation |
| `←` / `→` | Step time backward / forward by 15 minutes (Shift: 60 minutes) |
| `Home` / `End` | Jump to 00:00 / 24:00 (on sliders) |
| `PageUp` / `PageDown` | Jump 60 minutes backward / forward (on sliders) |
| `Esc` | Close Flight Drawer and modal dialogs |
| `R` | Trigger AI recovery recommendations |
| `1` | Switch to **Baseline** view (clear skies schedule) |
| `2` | Switch to **Disrupted** view (active cascade) |
| `3` | Switch to **Recovered** view (with action applied) |
| `Ctrl + Z` | Undo last closure change |
| `Ctrl + Shift + Z` | Redo closure change |

---

## 8. Extras & Control Room Tools

- **"The Mumbai Domino" 60s Demo**: One click in the top bar automatically sets Mumbai (BOM) closed 14:00–15:30, lets the cascade unfold across the map and Gantt, runs the AI dispatcher evaluation, and applies the optimal spare aircraft swap.
- **Find Weakest Airport**: Simulates a standard 1-hour closure at all 16 airports in India and ranks them by total stranded passengers and delay minutes to identify single-point-of-failure hubs.
- **1-Page Printable Briefing**: Click the printer icon in the top bar for a print-optimized executive incident report comparing Disrupted vs. Recovered metrics with net recovery benefits.
