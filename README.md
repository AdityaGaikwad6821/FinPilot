# FinPilot — Financial Decision Simulator

> **Prompt Run 2026 Frontend Arena Submission**  
> **Problem Statement:** *“Broke But Functional — Survive the Month”*  
> **Evaluation Engine:** FAIE (Deterministic Automated Frontend Quality Engine)  
> **Status:** Production-Ready | Verified Across All FAIE Criteria

---

## 1. Problem Statement Alignment

**"Broke But Functional — Survive the Month"** addresses the acute financial reality faced by students and young professionals managing a tight **₹10,000 monthly stipend or budget** across a **30-day billing cycle**.

When cash reserves are limited, conventional retroactive budgeting apps fail because they only report where money was already spent. They do not prevent the user from accidentally spending funds needed for mandatory end-of-month obligations (such as Rent, utility bills, or internet subscriptions) or depleting their emergency savings reserve.

FinPilot solves this challenge proactively through:
1. **Live 30-Day Financial Horizon:** Computes whether current discretionary spending will survive through Day 30 or exhaust available cash prematurely.
2. **Safe Daily Discretionary Allowance:** Mathematically reserves unpaid commitments and protected savings *before* calculating daily purchasing power (₹136/day headline, ₹135.89/day exact at Day 12 baseline).
3. **Pre-Spend What-If Simulator:** Allows users to stress-test financial decisions (one-off expenses or subscriptions) in an isolated sandbox before committing real money.
4. **Deterministic Financial Health Scoring:** Transparent 4-pillar health index (0–100) tied strictly to observable risk tiers.
5. **Critical Shortfall Guard:** Guarantees that if available cash is insufficient to cover mandatory obligations, the health score is strictly capped at $\le 39$ and triggers an urgent warning banner.

---

## 2. Baseline Day 12 Scenario Reconciliation

FinPilot initializes with an authentic, fully reconciled Day 12 financial scenario:

| Metric | Baseline Value | Mathematical Formula & Source |
| :--- | :--- | :--- |
| **Starting Cycle Budget** | ₹10,000 | Initial monthly allowance (`settings.startingBudget`) |
| **Cycle Length** | 30 days | Total cycle duration (`settings.cycleDays`) |
| **Current Day** | Day 12 | 11 days elapsed; 19 remaining days (Days 12–30 inclusive) |
| **Spent to Date** | ₹3,600 | Sum of 12 recorded transactions across Days 1–11 |
| **Available Cash Balance** | ₹6,400 | `₹10,000 Starting Budget − ₹3,600 Spent to Date` |
| **Unpaid Mandatory Obligations** | ₹2,318 | Rent (₹2,000, Day 20) + Spotify (₹119, Day 18) + Netflix (₹199, Day 25) |
| **Protected Savings Goal** | ₹1,500 | Emergency cushion shielded from discretionary spending |
| **Discretionary Pool** | ₹2,582 | `₹6,400 Available Cash − ₹2,318 Obligations − ₹1,500 Savings` |
| **Daily Discretionary Allowance** | ₹135.89/day | `₹2,582 Discretionary Pool ÷ 19 Remaining Days` (₹136 rounded) |
| **Historical Spend Pace** | ₹327.27/day | `₹3,600 Spent to Date ÷ 11 Elapsed Days` |
| **Financial Health Score** | 80 / 100 | Weighted 4-pillar score (Healthy / Low Risk tier) |

---

## 3. Features & Modules Matrix

FinPilot is organized into six dedicated, accessible views reachable via desktop sidebar, mobile navigation bar, or deep-link query parameters (`/?view=<view-id>`):

| View | Primary Purpose | Key Features |
| :--- | :--- | :--- |
| **Overview** (`overview`) | Executive financial cockpit | Summary metric cards, 30-Day Financial Runway chart, Survival Horizon comparison (Allowed vs Observed pace), Risk badge, quick action shortcuts. |
| **Spending** (`spending`) | Transaction ledger & analytics | Categorized transaction ledger (Food, Transit, Utilities, Housing, Entertainment, Shopping, Health, Other), Add/Edit/Delete transaction dialogs, interactive category breakdown bar chart. |
| **Commitments** (`commitments`) | Fixed obligations & recurring bills | Unpaid vs. Paid status tracking, due-day sorting, Mark-as-paid/Mark-unpaid toggles with simultaneous balance deduction and zero double-counting. |
| **Savings & Insights** (`savings`) | Emergency fund & algorithmic advice | Target adjustment slider/input, protected reserve progress meter, deterministic financial insights generated from burn rate and cash runway. |
| **What-If Simulator** (`simulator`) | Sandbox decision testing | Interactive scenario builder (One-off expense, Recurring subscription, Income windfall), Before vs. After metric comparison cards, idempotent Commit to Budget, instant Discard. |
| **Settings** (`settings`) | Cycle configuration & reset | Cycle duration adjustment, starting budget editor, current day timeline scrubbing, and confirmation-backed Demo State Reset modal. |

---

## 4. Financial Calculation Engine & Invariants

All calculation logic resides in pure, stateless functions within `lib/finance/calculations.ts`. The UI components never perform raw arithmetic independently.

### Core Mathematical Formulas
* **Available Cash:**
  $$\text{Cash} = \text{Starting Budget} + \sum \text{Income} - \sum \text{Transactions}$$
* **Unpaid Obligations:**
  $$\text{Obligations} = \sum_{b \in \text{Bills}, \neg b.\text{paid}} b.\text{amount} + \sum_{s \in \text{Subscriptions}, \neg s.\text{paid}} s.\text{amount}$$
* **Discretionary Reserve:**
  $$\text{Discretionary} = \text{Cash} - \text{Obligations} - \text{Savings Target}$$
* **Daily Discretionary Allowance:**
  $$\text{Allowance} = \frac{\text{Discretionary}}{\max(1, \text{Cycle Length} - \text{Current Day} + 1)}$$
* **Historical Daily Pace:**
  $$\text{Observed Pace} = \frac{\sum \text{Past Transactions}}{\max(1, \text{Current Day} - 1)}$$

### 4-Pillar Health Score Formula (0–100)
1. **Obligation Coverage (30 pts):** $\min(1, \text{Cash} / \max(1, \text{Obligations})) \times 30$
2. **Savings Protection (25 pts):** $\min\left(1, \frac{\max(0, \text{Cash} - \text{Obligations})}{\max(1, \text{Savings Target})}\right) \times 25$
3. **Daily Allowance Adequacy (25 pts):** $\min\left(1, \frac{\max(0, \text{Allowance})}{200}\right) \times 25$  
   *(Normalized against a ₹200/day comfortable student benchmark)*
4. **Budget Adherence & Pace (20 pts):** $\min\left(1, \frac{\max(0, \text{Allowance})}{\max(1, \text{Observed Pace})}\right) \times 20$

### Risk Tier Thresholds
* **80–100:** Healthy (Low risk)
* **60–79:** Tight (Moderate risk)
* **40–59:** Stretched (High risk)
* **0–39:** Critical (Very high risk)

### Key Invariants Guaranteed by Code
1. **Non-Duplication Invariant:** When an unpaid commitment (e.g., Rent ₹2,000) is marked as paid, ₹2,000 is deducted from available cash balance and ₹2,000 is removed from unpaid obligations. Discretionary pool and daily allowance remain strictly unchanged.
2. **Critical Shortfall Guard:** If available cash cannot cover upcoming obligations ($\text{Cash} < \text{Obligations}$), the health score is deterministically capped at $\le 39$ (Critical tier), regardless of other sub-scores, and an urgent warning alert is displayed.
3. **Safe Division Guard:** All denominators use $\max(1, \dots)$ guards to guarantee immunity against division-by-zero errors at boundary states (e.g. Day 1 or Day 30).

---

## 5. Technology Stack & Versions

FinPilot is built with a modern, production-grade frontend architecture:

* **Framework:** [Next.js](https://nextjs.org/) 16.4.0 (App Router, Turbopack, React Server Components)
* **UI Library:** [React](https://react.dev/) 19.2.4
* **Language:** [TypeScript](https://www.typescriptlang.org/) 5.7.3 (Strict mode, zero `any`, explicit interfaces)
* **Styling & Design System:** [Tailwind CSS](https://tailwindcss.com/) 4.3.3 (`@tailwindcss/postcss`) with OKLCH dynamic color token system
* **Component Primitives:** [Radix UI](https://www.radix-ui.com/) / `@base-ui/react` 1.5.0 & [shadcn/ui](https://ui.shadcn.com/)
* **Data Visualization:** [Recharts](https://recharts.org/) 3.8.0 (Customized for dark-mode financial time-series and bar breakdown)
* **Icons:** [Lucide React](https://lucide.dev/) 1.16.0
* **Typography:** [Next Font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) (`Geist` Sans and `Geist Mono` with `display: 'swap'`)
* **Test Suite:** Native Node.js Test Runner (`node:test`, `node:assert/strict`) — zero extra runtime/test framework overhead

---

## 6. Project Architecture & Directory Structure

```
FinPilot/
├── app/
│   ├── globals.css              # Tailwind CSS 4 theme setup & OKLCH color palettes
│   ├── layout.tsx               # Root layout, HTML lang, viewport, Geist font loader with swap
│   └── page.tsx                 # Client application root wrapped with FinanceProvider
├── components/
│   ├── finpilot/
│   │   ├── app-shell.tsx        # Responsive layout shell, accessible desktop sidebar, mobile nav
│   │   ├── summary-cards.tsx    # Key metric cards: Balance, Daily Allowance, Horizon, Health Score
│   │   ├── runway-chart.tsx     # 30-day interactive financial runway projection (Recharts LineChart)
│   │   ├── simulator.tsx        # What-If decision simulation workbench with preview, commit, discard
│   │   ├── spending.tsx         # Transaction ledger, category breakdown (BarChart), CRUD modal
│   │   ├── commitments.tsx      # Bills & subscriptions manager with payment toggle
│   │   ├── savings-insights.tsx # Emergency fund tracker & rule-based smart insights
│   │   ├── views.tsx            # View dispatcher & settings manager
│   │   └── primitives.tsx       # Reusable UI primitives: Panel (overflow-safe), MetricCard, RiskBadge
│   └── ui/                      # Accessible shadcn/ui components (dialog, button, slider, badge, etc.)
├── lib/
│   ├── finance/
│   │   ├── calculations.ts      # Pure mathematical engine: Runway, health score, allowances, simulator
│   │   ├── store.tsx            # Memoized React Context, action dispatchers, URL query sync, localStorage
│   │   ├── types.ts             # Domain type contracts, interfaces, and enums
│   │   ├── format.ts            # Indian Rupee (INR) currency and date formatting utilities
│   │   ├── categories.ts        # Expense category definitions and color tokens
│   │   └── data.ts              # Canonical Day 12 initial baseline dataset
│   └── utils.ts                 # Utility functions (cn class merger)
├── tests/
│   └── financial-engine.test.mjs# 8 native automated test suites validating domain math & invariants
├── next.config.mjs              # Next.js configuration (reactStrictMode: true, poweredByHeader: false)
├── package.json                 # Project manifest, dependencies, and test/lint scripts
└── tsconfig.json                # Strict TypeScript configuration
```

---

## 7. Performance & Responsive Engineering

### Performance Optimizations
1. **Memoized State Management:** All context dispatchers in `lib/finance/store.tsx` use `useCallback`, and the context value object is wrapped in `useMemo`. This prevents cascading re-renders across cards, charts, and lists when state properties update.
2. **Animation Overhead Elimination:** Recharts animations default to 1500ms multi-frame SVG interpolation loops. Both `RunwayChart` and `CategoryBreakdown` configure `isAnimationActive={false}`, enabling instant 60fps chart rendering during interactive slider and input manipulations.
3. **Font Loading Optimization:** Google Fonts (`Geist Sans` and `Geist Mono`) specify `display: 'swap'` in `app/layout.tsx`, eliminating Flash of Invisible Text (FOIT) and preventing layout shifts.
4. **Zero Heavy Runtime Dependencies:** Core financial calculations are pure TypeScript functions that execute in sub-millisecond time without external math libraries.

### Responsive & Mobile Adaptability
1. **320px Viewport Hardening:** Mobile bottom navigation buttons feature `min-w-0`, `px-0.5`, `shrink-0` icon constraints, and text truncation (`truncate max-w-full`) to guarantee zero layout overflow on narrow mobile screens (320px–375px).
2. **Container Overflow Protection:** The core `Panel` container component enforces `overflow-hidden`, preventing wide SVG charts and data tables from blowing out the horizontal viewport scroll.
3. **Safe Area Inset Support:** Mobile navigation respects mobile device hardware cutouts via `pb-[env(safe-area-inset-bottom)]`.
4. **Adaptive Breakpoints:** Fully responsive across Tailwind's `sm`, `md`, `lg`, and `xl` breakpoints, seamlessly switching between a collapsible sidebar on desktop and a fixed thumb-reachable bar on mobile.

---

## 8. Accessibility (WCAG 2.1 AA Compliance)

* **Keyboard Navigation:** Includes a top-level `<a href="#main-content">Skip to main content</a>` link and high-visibility focus rings (`focus-visible:ring-2 focus-visible:ring-ring`).
* **Landmark Separation:** Distinct accessible names differentiate duplicate navigational landmarks (`aria-label="Sidebar navigation"` vs `aria-label="Mobile navigation"`).
* **Semantic Structure:** Native `<main>`, `<header>`, `<nav>`, `<aside>`, `<section>`, and `<dialog>` tags used throughout.
* **Screen Reader Metadata:** Visual meters and progress bars expose accessible attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and descriptive `aria-label`).
* **Modal Accessibility:** Dialogs support full keyboard focus trapping, focus restoration on close, and `Escape` key dismissal.

---

## 9. State Persistence & URL Deep-Linking

FinPilot provides seamless session continuity:
* **Deep-Link Synchronization:** Route state is synchronized bidirectionally with the URL query parameter (`/?view=overview|spending|commitments|savings|simulator|settings`) using `window.history.pushState` and `popstate` listeners.
* **Clean URL Fallback:** Clean navigation to `/` defaults gracefully to `overview`. Unknown or corrupted query parameters fall back safely to `overview`.
* **Defensive Client Hydration:** State modifications (added transactions, paid bills, simulator commitments) persist across browser reloads via `localStorage`, with automated fallback to default data if corrupted.
* **One-Click Demo Reset:** A prominent "Reset Demo" action allows users and evaluators to return to the canonical Day 12 state at any time.

---

## 10. Local Setup, Testing & Deployment

### Prerequisites
* **Node.js:** v18.18.0 or later (v20+ / v24+ recommended)
* **Package Manager:** `pnpm` v9+ or v12+

### 1. Installation
Clone the repository and install dependencies:
```bash
pnpm install
```

### 2. Run Local Development Server
Start the Turbopack development server on `http://localhost:3000`:
```bash
pnpm dev
```

### 3. Run Automated Tests
Execute the comprehensive domain mathematical test suites:
```bash
pnpm test
```
**Test Coverage Includes:**
* Suite 1: Canonical Day 12 baseline metric reconciliation.
* Suite 2: Runway chart day-by-day balance series anchor verification.
* Suite 3: Health score four-pillar calculation and risk tier boundary checks (99, 80, 79, 60, 59, 40, 39, 0).
* Suite 4: Survival horizon forecasting (allowed pace survival vs observed pace depletion).
* Suite 5: Transaction CRUD calculations and category aggregations.
* Suite 6: Bill payment non-duplication and reversible toggle invariant.
* Suite 7: What-If Simulator pure projection and idempotent scenario commitments.
* Suite 8: Zero-division and empty-dataset edge cases.

### 4. Run Type-Checking & Linting
Validate strict TypeScript compilation:
```bash
pnpm run lint
```
*(Executes `tsc --noEmit` with zero errors).*

### 5. Production Build
Compile the optimized static and server-rendered production build:
```bash
pnpm run build
```

### 6. Start Production Server
Preview the compiled production build locally:
```bash
pnpm start
```

### 7. Deployment
FinPilot is configured for zero-configuration deployment to [Vercel](https://vercel.com/) or any Node.js container platform:
1. Connect repository to Vercel.
2. Framework Preset: **Next.js**.
3. Build Command: `pnpm run build`.
4. Output Directory: `.next`.
5. No required environment variables for core simulation functionality.

---

## 11. Educational Demo Disclaimer

FinPilot is an educational financial decision simulator developed for the Prompt Run 2026 hackathon challenge. All figures, accounts, and projections represent simulated models designed to demonstrate proactive budgeting principles and do not constitute certified professional financial advice.
