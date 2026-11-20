# Domino Sky: Flight Disruption Cascade & Recovery Simulator

**Domino Sky** is an interactive, deterministic flight network disruption and recovery simulator with an AI Dispatcher layer powered by Google Gemini.

When an airport closes for 90 minutes, it does not just delay flights at that single airfield. Because each aircraft flies a tightly scheduled chain of flights throughout the operating day, holding one aircraft propagates delays to later flights across the entire country—even in cities with completely clear skies. Inbound delays squeeze minimum turnaround times, break connecting passenger itineraries, and push flight crews past their legal duty limits (forcing emergency cancellations).

Domino Sky visualizes **which** flights are late, **why** they are late, **how many** passengers are stranded, and how **AI-guided recovery actions** (selective cancellations or spare aircraft swaps) resolve the cascade.

---

## 1. Key Highlights & Hard Rules

- **100% Deterministic Engine**: All delay minutes, cancellation decisions, crew duty limits, and passenger numbers come from pure TypeScript algorithms (`src/engine/`).
- **AI Explains & Recommends (Never Computes)**: The Google Gemini integration (`@google/genai`) only interprets precomputed engine results.
- **Strict Number & Option Validator**: Every number cited by Gemini in the summary, rationale, and caveats is cross-checked against the simulation `ResultJSON`. Any hallucinated or mismatched number triggers a retry or falls back to a verified deterministic template.
- **Self-Contained & Light Theme**: Built with a calm control-room aesthetic (`#F7F8FA` background, `#FFFFFF` cards, Inter and JetBrains Mono tabular typography), zero remote tile maps, and SVG rendering.
- **Responsive & Accessible**: Keyboard shortcuts (`Space`, `←/→`, `Esc`, `R`, `1/2/3`, `Ctrl+Z`), visible focus rings, ARIA labels, and a complete table-view toggle.

---

## 2. Architecture & File Structure

```text
├── data/
│   └── flight_network.json       # 16 airports, 70 flights, 21 connections, 16 crews, 2 spares
├── server/                       # Backend route for Google Gemini API
│   ├── apiHandler.ts             # Connect/Express middleware for /api/dispatch
│   ├── gemini.ts                 # @google/genai SDK integration (temperature: 0.2, responseSchema)
│   ├── validator.ts              # Strict number, HH:MM, and option ID validator
│   └── cache.ts                  # SHA-256 hash cache for scenario results & Q&A
├── src/
│   ├── engine/                   # Pure TypeScript simulation engine (zero UI dependencies)
│   │   ├── validator.ts          # Network data schema, tail contiguity, and integrity validator
│   │   ├── simulator.ts          # Deterministic single forward pass, ground holds, knock-on cascade
│   │   ├── connectionTracker.ts  # Missed connection calculation (< 45m min connect)
│   │   ├── crewDuty.ts           # 600m duty limits & iterative cancellation (max 5 rounds)
│   │   ├── recoveryEnumerator.ts # Evaluates ~100 candidate actions (spares & cancels), ranks top 3
│   │   └── weakestAirport.ts     # 1-hour sensitivity stress-test across all 16 airports
│   ├── components/
│   │   ├── topbar/               # Scenario name, Baseline/Disrupted/Recovered toggle, Share hash
│   │   ├── leftpanel/            # Closure Card (dual slider, presets) & Airport Impact Table
│   │   ├── centre/
│   │   │   ├── KpiStrip.tsx      # 5 KPI cards with count-up animations & passenger gauge
│   │   │   ├── NetworkMap.tsx    # Projected SVG India map, active plane arcs, holding loops, weather
│   │   │   ├── AircraftGantt.tsx # 16 tails + 2 spares, domino tipping animation, causal arrows
│   │   │   ├── DelayRibbon.tsx   # Delay-budget progress bar by root cause
│   │   │   ├── TimeScrubber.tsx  # 00:00–24:00 timeline, playback 1x/4x/16x, airborne counters
│   │   │   ├── WeakestAirportsModal.tsx # Vulnerability ranking matrix
│   │   │   └── ComparisonDetailsModal.tsx # Before vs. After diff table
│   │   ├── rightpanel/           # AI Dispatcher panel, Top 3 options, Trust badge, Q&A chat
│   │   ├── drawer/               # Flight detail drawer with vertical root cause chain
│   │   └── common/               # Empty state overlay, 4-step help tour, 1-page printable summary
│   ├── services/                 # aiDispatcher client service with 15s timeout & offline fallback
│   ├── utils/                    # SVG projection, time conversions, Web Audio chime synthesizer
│   └── App.tsx                   # Central state orchestration, undo/redo, linked selection
└── tests/
    ├── dataValidator.test.ts     # Validates flight_network.json schema integrity
    ├── engine.test.ts            # Baseline zero-delay test, 3 hand-calculated scenarios, crew timeout
    ├── recovery.test.ts          # Spare swap validity rules and candidate ranking order
    └── aiValidator.test.ts       # Exact number verification, formatted number support, ID checks
```

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

### Running the App
```bash
# Start Vite development server (with /api/dispatch middleware)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Unit Tests
```bash
npm run test
```
Runs the full Vitest test suite (`16/16 passing across 4 test suites`).

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 5. Delight & Motion Details

- **The Signature Moment**: When an airport closure is applied, dominoes tip over along each affected aircraft rotation chain in the Gantt with a 40ms stagger from left to right, and delayed bars stretch rightward with an elastic ease.
- **Flight Arcs & Holding Loops**: Active flights display small paper planes banking along the route with trailing dots. Flights held on the ground loop gently over the closed airport.
- **Weather Clouds & Sun**: A low-contrast drifting rain cloud hovers over closed airports; a sun peeks out on reopening.
- **Audio Chime**: A soft synthesizer chime (pure Web Audio API, zero audio files) sounds when a recovery action is successfully applied.
- **Accessibility & Reduced Motion**: Automatically honors the system `prefers-reduced-motion` setting or in-app toggle, instantly switching all animations to instantaneous state transitions.

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause time scrubber simulation |
| `←` / `→` | Step time backward / forward by 15 minutes |
| `Esc` | Close Flight Drawer and modals |
| `R` | Trigger AI recovery recommendations |
| `1` | Switch to **Baseline** view (clear skies schedule) |
| `2` | Switch to **Disrupted** view (active cascade) |
| `3` | Switch to **Recovered** view (with action applied) |
| `Ctrl + Z` | Undo last closure change |
| `Ctrl + Shift + Z` | Redo closure change |

---

## 7. Extras

- **"The Mumbai Domino" 60s Demo**: One click in the top bar automatically sets Mumbai (BOM) closed 14:00–15:30, lets the cascade unfold across the map and Gantt, runs the AI dispatcher evaluation, and applies the optimal spare aircraft swap.
- **Find Weakest Airport**: Simulates a standard 1-hour closure at all 16 airports in India and ranks them by total stranded passengers and delay minutes to identify single-point-of-failure hubs.
- **1-Page Printable Briefing**: Click the printer icon in the top bar for a print-optimized executive incident report comparing Disrupted vs. Recovered metrics with net recovery benefits.
