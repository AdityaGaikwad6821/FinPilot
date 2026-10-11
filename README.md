# FinPilot — Simulate Before You Spend

> **Prompt Run 2026 Frontend Arena Submission**  
> **Problem Statement:** *“Broke But Functional — Survive the Month”*  
> **Evaluation Engine:** FAIE (Deterministic Automated Frontend Quality Engine)

---

## 1. Problem Statement Alignment

**"Broke But Functional — Survive the Month"** addresses the acute financial reality faced by Gen Z students and young professionals managing a limited **₹10,000 monthly budget** over a **30-day cycle**. 

When money is tight, everyday expenses easily cannibalize funds needed for mandatory end-of-month commitments like Rent, utilities, and emergency savings. FinPilot bridges the gap between passive budgeting apps and real-world behavior by providing:

1. **A Live 30-Day Survival Horizon:** Explicitly models whether current cash burn will survive the month or run out of cash before cycle end.
2. **Deterministic Daily Allowance:** Calculates the exact safe discretionary allowance (`₹135.89/day` on Day 12) after strictly reserving upcoming bills and protected savings.
3. **What-If Simulation Engine:** Allows users to preview the exact consequence of a purchase or subscription before spending real money.
4. **Independent Critical Shortfall Guard:** Prominently alerts the user whenever cash cannot cover essential obligations, guaranteeing that a high health score never masks an impending deficit.

---

## 2. Baseline Day 12 Financial Reconciliations

FinPilot initializes with a realistic, mathematically reconciled sample scenario:

| Metric | Amount | Formula / Explanation |
| :--- | :--- | :--- |
| **Starting Budget** | ₹10,000 | Configurable cycle starting balance |
| **Cycle Length** | 30 days | Total days in budget period |
| **Current Day** | Day 12 | 11 days elapsed, 19 remaining days (Day 12–30 inclusive) |
| **Spent So Far** | ₹3,600 | 12 recorded transactions across Days 1–11 |
| **Available Cash Balance** | ₹6,400 | `₹10,000 Starting Budget − ₹3,600 Spent to Date` |
| **Unpaid Obligations** | ₹2,318 | Rent (₹2,000, Day 20) + Spotify (₹119, Day 18) + Netflix (₹199, Day 25) |
| **Protected Savings Goal** | ₹1,500 | Emergency reserve protected from discretionary spending |
| **Discretionary Funds** | ₹2,582 | `₹6,400 Available Cash − ₹2,318 Obligations − ₹1,500 Savings` |
| **Daily Discretionary Allowance** | ₹135.89/day | `₹2,582 Discretionary Funds ÷ 19 Days Remaining` |
| **Historical Spend Pace** | ₹327.27/day | `₹3,600 Spent ÷ 11 Days Elapsed` |
| **Financial Health Score** | 80 / 100 | Documented 4-component formula (Low risk / Healthy tier) |

---

## 3. Financial Calculation Model & Core Rules

All application views—Dashboard, Financial Runway Chart, Commitments, Spending, Savings, and Simulator—derive their metrics from a single centralized calculation engine in `lib/finance/calculations.ts`.

### Calculation Rules
* **Remaining Cash:**  
  $$\text{Cash} = \text{Starting Budget} + \text{Income} - \sum \text{Recorded Transactions}$$
* **Unpaid Obligations:**  
  Sum of mandatory commitments and active recurring subscriptions due within the current cycle that are in `unpaid` status.
* **Discretionary Funds:**  
  $$\text{Discretionary} = \text{Remaining Cash} - \text{Unpaid Obligations} - \text{Protected Savings Target}$$
* **Daily Discretionary Allowance:**  
  $$\text{Allowance} = \frac{\text{Discretionary Funds}}{\max(1, \text{Cycle Length} - \text{Current Day} + 1)}$$
* **Non-Duplication Invariant:**  
  When an unpaid bill (e.g., Rent ₹2,000) is marked as paid, the payment is recorded against cash balance once and the unpaid obligation is decremented simultaneously. Discretionary funds and daily allowance remain unchanged.

### Financial Health Score (0–100)
A transparent, educational health score calculated from four components:
1. **Obligation Coverage (30 pts):** $\min(1, \text{Cash} / \text{Unpaid Obligations}) \times 30$
2. **Savings Goal Protection (25 pts):** $\min(1, \max(0, \text{Cash} - \text{Obligations}) / \text{Savings Target}) \times 25$
3. **Daily Discretionary Allowance (25 pts):** $\min(1, \max(0, \text{Allowance}) / 200) \times 25$
4. **Budget Adherence & Pace (20 pts):** Ratio of allowed pace to historical spend pace.

#### Deterministic Risk Thresholds:
* **80–100:** Healthy / Low risk
* **60–79:** Tight / Moderate risk
* **40–59:** Stretched / High risk
* **0–39:** Critical / Very high risk

> **Critical Shortfall Guard:** If available cash cannot cover upcoming unpaid commitments ($\text{Cash} < \text{Obligations}$), the health score is strictly capped at $\le 39$ and triggers an independent critical warning banner.

---

## 4. 30-Day Survival Horizon Engine

The Survival Horizon component projects whether the user will survive the month under two comparative models:

1. **Under Allowed Pace (₹135.89/day):**  
   User survives through Day 30 and finishes the cycle with ₹1,500 protected savings intact.
2. **Under Observed Pace (₹327.27/day):**  
   At the historical burn rate, upcoming obligations (Rent on Day 20 and Netflix on Day 25) will deplete all remaining cash by **Day 25**, triggering a deficit of -₹496.  
   The system provides actionable guidance: *“Slow down to the recommended ₹136/day to survive through Day 30.”*

---

## 5. What-If Simulator Architecture

The Simulator allows users to stress-test financial decisions prior to commitment:
* **Pure Functional Projections:** Scenarios are previewed using `applyScenario()` without mutating active application state.
* **Idempotent Commitments:** Prevents duplicate deductions through explicit committed scenario tracking (`committedScenarioIds`).
* **Safe Discard:** Clears preview drafts instantly and restores original plan metrics.

---

## 6. Architecture & State Management

```
FinPilot/
├── app/
│   ├── layout.tsx         # Semantic HTML, metadata, Geist typography
│   ├── page.tsx           # Application entry point wrapped in FinanceProvider
│   └── globals.css        # Tailwind CSS 4 theme variables
├── components/
│   ├── finpilot/
│   │   ├── app-shell.tsx       # Sidebar, mobile navigation, skip-to-content
│   │   ├── summary-cards.tsx   # Available balance, survival horizon, health score
│   │   ├── runway-chart.tsx    # Recharts 30-day financial runway projection
│   │   ├── simulator.tsx       # What-If Simulator interactive workbench
│   │   ├── spending.tsx        # Transaction CRUD & category breakdowns
│   │   ├── commitments.tsx     # Bills and subscription management
│   │   ├── savings-insights.tsx# Savings goal configuration & smart insights
│   │   └── views.tsx           # Route views & settings management
│   └── ui/                     # Accessible shadcn/ui component primitives
├── lib/
│   ├── finance/
│   │   ├── calculations.ts     # Pure mathematical calculation engine
│   │   ├── store.tsx           # React Context, state hydration, URL query sync
│   │   ├── types.ts            # TypeScript interfaces & domain contracts
│   │   ├── format.ts           # Indian Rupee (INR) formatting utilities
│   │   └── data.ts             # Initial reconciled sample data
└── tests/
    └── financial-engine.test.mjs # Automated test suite (node:test)
```

### URL Synchronization & Navigation State
FinPilot supports deep-linking and state restoration across browser reloads:
* Supported route parameter: `/?view=overview|spending|commitments|savings|simulator|settings`.
* Synchronized bidirectionally with `window.history.pushState` and `popstate`.
* Invalid parameters gracefully fall back to `overview`.
* Preserves user modifications across page refreshes via defensive `localStorage` hydration.

---

## 7. Accessibility (WCAG 2.1 AA Compliance)

* **Landmark Structure:** Features unique accessible names for all landmarks (`aria-label="Sidebar navigation"` vs `aria-label="Mobile navigation"`).
* **Keyboard Accessibility:** Includes a functional `<a href="#main-content">Skip to main content</a>` link and full keyboard focus indicators (`focus-visible:ring-2`).
* **Semantic HTML:** Correct usage of `<main>`, `<header>`, `<nav>`, `<aside>`, `<article>`, and `<dialog>` tags.
* **Screen Reader Support:** All progress bars, meters, and charts include descriptive `aria-label`, `aria-valuenow`, and tabular equivalents.

---

## 8. Verification & Test Commands

All test scripts execute meaningful assertions using standard Node.js native tooling without external test dependencies:

### 1. Run Automated Tests
```bash
pnpm test
```
*Executes all 8 domain test suites covering initial baseline figures, chart anchor calibration, health score boundaries, survival burn rate forecasting, CRUD operations, reversible payments, simulator idempotency, and division-by-zero edge cases.*

### 2. Run TypeScript Type Check
```bash
pnpm run lint
# or
pnpm exec tsc --noEmit
```
*Validates 100% type safety with zero errors.*

### 3. Production Build
```bash
pnpm run build
```
*Compiles the optimized Next.js production build with strict TypeScript type-checking enabled.*
