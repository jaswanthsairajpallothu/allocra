# ⚡ Allocra — Intelligent Task Allocation Engine

<p align="center">
  <img src="assets/banner.png" width="100%" />
</p>

<div align="center">

<br/>


## The Uncomfortable Truth

> Most teams are not optimizing work. They are reacting to it.

Most teams don't have a task management problem.

They have a **task assignment problem**.

They solve it with:
- hierarchy
- habit
- guesswork

Allocra replaces that with **math — and the math shows its work.**

---

<div align="center">

<br/>

## A Situation You Already Recognize

<br/>

Your backlog has 47 tasks.
Your best engineer has 6 hours left this sprint.

Your PM assigns them 3 more.

<br/>

Allocra would have said:

> **No. And here's exactly why.**

<br/>

</div>

---

> The question isn't "who should do this?"
> 
> It's "why this person over everyone else?"

---

> Most teams call it process.  
> It's guesswork with confidence.

> And guesswork is not a strategy.

---

<div align="center">

**BUILT BY** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ENGINEER WHO DESIGNS DECISION SYSTEMS  
**NOT DRIVEN BY** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; OPINION OR HIERARCHY  
**POWERED BY** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CONSTRAINTS, LOGIC, REALITY  
**ALLOCATION METHOD** &nbsp; MATH, NOT VIBES

</div>

> This is not a tool.  
> This is a decision system.

---

## Why This Exists

> This is what most teams call "resource planning".

<div align="center">

| What They Call It | What It Actually Is |
|:-----------------|:-------------------|
| "Resource Planning" | One person guessing in a spreadsheet |
| "Fair Distribution" | Whoever the PM remembers first |
| "Skill-Based Assignment" | Giving everything to the senior dev |
| "Capacity Check" | Asking "are you free?" in standup |
| "Workload Balancing" | Realizing someone's overloaded... after the sprint fails |

</div>

<br/>

This isn't a tools problem. Jira, Asana, Monday —
**they track work. They don't decide who should do it.**

Allocra does.

> Every assignment is explainable. If it isn't, it doesn't exist.

---

## The Business Case

<div align="center">

| Before Allocra | After Allocra |
|:--------------|:-------------|
| Senior devs drowning, juniors idle | Workload balanced by actual capacity |
| "Why did I get this?" conversations | Every assignment has a visible score + reasoning |
| Sprint failures from silent overload | Overload detected and rejected *before* assignment |
| Allocation takes a meeting | Allocation takes < 1 second |
| Bias disguised as "judgment" | Decisions based on skill, load, and priority — auditable |

</div>

**The ROI isn't in the software. It's in the arguments you stop having.**

> The system doesn't just allocate work.  
> It removes the need to argue about it.

---

## The Engineering Case

> Hungarian is optimal.  
> Greedy is explainable.

At this scale, explainability wins.

If you can't justify an assignment, you don't have a system.

---

## Scoring

<div align="center">

| Factor | Weight | What It Answers |
|:-------|:------:|:---------------|
| `skill_match` | **x5** | Can this person actually do this? |
| `free_time_score` | **x3** | Do they have bandwidth? |
| `load_penalty` | **x-4** | Are we about to burn someone out? |
| `priority_score` | **x2** | Does this task matter right now? |

</div>

```python
score = (5 * skill_match) + (3 * free_time_score) - (4 * load_penalty) + (2 * priority_score)
```

These weights are deliberate.

---

## Edge Cases

<div align="center">

| Scenario | What Most Tools Do | What Allocra Does |
|:---------|:-------------------|:-----------------|
| No one is qualified | Assign anyway | Mark `unassigned`, surface it |
| Equal scores | Random pick | Picks least loaded |
| Someone's full | Add to the pile | Reject before damage is done |
| Priorities shift | Manual reshuffling | Full recomputation |

</div>

Failure is surfaced, not hidden.

---

<div align="center">

## System Stack

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br/>

[![Algorithm](https://img.shields.io/badge/algorithm-Greedy_Optimization-FF6B35?style=for-the-badge&logo=databricks&logoColor=white)](#scoring)
[![Complexity](https://img.shields.io/badge/complexity-O(n_×_m)-8E24AA?style=for-the-badge&logo=stackblitz&logoColor=white)](#scoring)
[![Output](https://img.shields.io/badge/output-Deterministic-1565C0?style=for-the-badge&logo=checkmarx&logoColor=white)](#edge-cases)
[![Latency](https://img.shields.io/badge/allocation_speed-<_1_sec-00C853?style=for-the-badge&logo=speedtest&logoColor=white)](#the-business-case)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## Final Reality

If your team assigns tasks without being able to explain *why* —

you don't have a system.

You have guesswork with confidence.

And guesswork does not scale.

It compounds.
