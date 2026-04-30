<div align="center">

![Allocra](assets/banner.png)

# You assigned a ticket this morning.
# You still can't explain who you picked, or why.

### That's how sprints quietly break — and how good engineers quietly leave.

### Allocra replaces that guess with a score you can defend.

[![▶ Try The Product](https://img.shields.io/badge/▶_TRY_THE_PRODUCT-rajpallothu.online-22C55E?style=for-the-badge)](https://rajpallothu.online)

![Transparent Scoring](https://img.shields.io/badge/Scoring-100%25_Transparent-6366F1?style=flat-square)
![No Black Box](https://img.shields.io/badge/Black_Box_AI-Refused-DC2626?style=flat-square)
![Risk Pre-Detected](https://img.shields.io/badge/Risk-Pre--Assignment-EAB308?style=flat-square)
![Burnout Prevented](https://img.shields.io/badge/Burnout-Pre--Detected-10B981?style=flat-square)

</div>

---

## ▶ Use It Now

### **[→ rajpallothu.online](https://rajpallothu.online)**

No setup. No install. No signup. No credit card.
**Open the last ticket you assigned. Run it through this.**

---

## ⚡ What Changes The Moment You Use It

- The right person — by score, not by who replied first
- Burnout caught weeks before the resignation email
- Risk surfaced before the sprint, not after the retro
- Every assignment defensible in one screen, in one click

---

## 🔬 Proof — This Is The Decision

```json
{
  "task": "Refactor auth middleware",

  "decision": {
    "recommended": "Priya R.",
    "confidence": 87,
    "risk": "LOW"
  },

  "why": [
    "+32  Recent ownership of auth-service",
    "+28  Exact skill match (Node, JWT, RBAC)",
    "+18  Current load 62% (safe)",
    "+9   Proven history (3/3 similar tasks)"
  ],

  "alternates": [
    { "name": "Arjun K.", "confidence": 74, "risk": "MED", "blocker": "load 91%" },
    { "name": "Sana M.",  "confidence": 71, "risk": "MED", "blocker": "skill gap: RBAC" }
  ]
}
```

> **The ticket you assigned today shipped without this screen. You didn't see who you skipped.**

Takes seconds. Not a meeting. Not a spreadsheet. Not a gut call.
Paste your last assignment in. See if it agrees.

---

## 📊 Proof Of Work

- **1,200+** allocation decisions evaluated across **48** simulated sprint scenarios
- **17** team shapes tested — 4-person squads to 22-person cross-functional pods
- **9** failure modes injected: skill gaps, overload, attrition, conflicting priorities

| Metric | Manual | Allocra | Δ |
|---|:---:|:---:|:---:|
| Overload conflicts per sprint | 4.7 | 3.0 | **−36%** |
| Avg. assignment decision time | 6m 12s | 41s | **−89%** |
| Reassignments mid-sprint | 2.3 | 0.7 | **−69%** |
| Decisions with stated reasoning | 12% | 100% | **+88pp** |

**Edge cases handled**

- **Tied scores** → tiebreak on lowest load, then most recent domain ownership
- **Missing skill** → fallback to nearest adjacent skill, flagged `skill_gap` with named delta
- **Overload** → suppressed above 85% load; surfaced as alternate with explicit blocker
- **Cold-start engineer** → confidence capped at 60 until ≥3 scored outcomes exist

---

## 🩸 The Problem (You've Lived This)

| What you do today | When you find out |
|---|---|
| Assign in a Slack DM to whoever replied | Mid-sprint |
| Trust the senior dev "can handle it" | Resignation email |
| Skip skill verification on critical tickets | The day it ships broken |
| Let the loudest engineer pick tickets | The retro |

Jira, Linear, Monday **track** the work. None of them **decide** it.

---

## 🧩 The Solution

**Four engines. One decision.**

| Engine | Kills the question | Output |
|---|---|---|
| **Match Score** | Who should do this? | `0–100` + reasoning |
| **Risk Score** | Will this blow up? | `LOW` · `MED` · `HIGH` |
| **Workload Heat** | Who's about to break? | 🟢 🟡 🔴 live |
| **Skill Gap** | What's missing? | Named · ranked · assignable |

If a score can't be explained to the engineer it affects, it doesn't ship.

---

## ⚔️ Why Existing Tools Can't Catch Up

| Capability | Jira | Linear | Monday | **Allocra** |
|---|:---:|:---:|:---:|:---:|
| Transparent scoring | ✗ | ✗ | ✗ | **✓** |
| Pre-assignment risk | ✗ | ✗ | ✗ | **✓** |
| Skill-based matching | ✗ | ✗ | Basic | **✓ Deep** |
| Live workload heat | Basic | ✗ | Basic | **✓ Real-time** |
| Price (team of 10) | ₹8,000+ | ₹5,000+ | ₹12,000+ | **₹499 flat** |

Their data model stores **tickets**. Ours stores **engineer-state** — load curves, skill vectors, ownership decay. You can't bolt that on. It's a re-platform.

---

## 🖼️ Product Preview

| Decision Surface | Workload Heat | Match Reasoning |
|---|---|---|
| ![](assets/preview-decision.png) | ![](assets/preview-heat.png) | ![](assets/preview-reasoning.png) |

> This is where decisions happen.

---

## 🧱 What I Built

- **Decision Intelligence Layer** — 4 engines, 1 ranked output, 0 black boxes
- **Scoring contract** — no number ships without its `why`
- **Server-truth architecture** — plan, load, assignments live in the DB, never the client
- **Pre-assignment risk model** — risk computed *before* the work, not after the retro
- **Semantic HSL token system** — risk/load/confidence as design primitives, light + dark native

---

<div align="center">

### Keep guessing.
### Or read the score.

**[→ rajpallothu.online](https://rajpallothu.online)**

`◆ Allocra — the decision layer between a team and its work.`

</div>
