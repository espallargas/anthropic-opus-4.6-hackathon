# FreePath — Breaking Barriers to Immigration Guidance

## AI that understands YOUR immigration journey

### ✨ [Live Demo](https://claude-opus-4-6-hackathon.onrender.com/)

### Anthropic Virtual Hackathon 2026 | Problem Statement: "Break the Barriers"

Breaking barriers to immigration guidance — legal knowledge that was once locked
behind expensive lawyers, language barriers, and expertise requirements is now
accessible to everyone through Claude Opus 4.6.

---

## 🚀 The Problem We Solve

**280+ million immigrants worldwide face the same nightmare**: Immigration law is
locked behind three impenetrable barriers.

### **Barrier 1: Expertise**

Immigration law requires specialized lawyers. A typical immigration case costs
**$1,500–$5,000+** in legal fees—unaffordable for most migrants.

### **Barrier 2: Cost**

Legal fees consume relocation budgets. Without a lawyer, immigrants make costly
mistakes: missing deadlines, submitting wrong documents, or following outdated
processes.

### **Barrier 3: Language & Accessibility**

Resources exist in English, Spanish, French—but 280+ million immigrants speak
200+ languages. An Arabic speaker seeking a UK visa. A Portuguese speaker in
Germany. A Tamil speaker in Canada. They're stuck.

---

## ✅ How FreePath Breaks These Barriers

| Barrier   | Solution                  | FreePath             |
| --------- | ------------------------- | -------------------- |
| Expertise | Pay lawyers $1-5K+        | AI legal guidance    |
| Cost      | Afford legal fees or fail | FREE                 |
| Language  | Find resources in lang    | Multi-language RTL   |
| Personal  | Generic website advice    | Personalized pathway |

**Real-world difference**:

- 🇻🇪 Venezuelan seeking Brazil residency → Different pathway than
- 🇩🇪 German seeking UK work visa → Different from
- 🇳🇬 Nigerian seeking Canadian asylum

FreePath personalizes completely. One-size-fits-all websites fail. **We don't.**

---

## 🧠 How It Works: The Opus 4.6 Innovation

FreePath uses **Claude Opus 4.6** to break the expertise barrier—without needing
3 years of law school.

### **1. Ingesting Entire Legislation Corpus**

Traditional AI suffers from "context rot": too many documents = degraded
reasoning. **Opus 4.6's 1M token context** (beta) solves this.

- ✅ **76% retrieval accuracy** vs 18.5% previous generation
- ✅ Load 100+ pages of legislation at once
- ✅ Understand country-specific nuances across entire legal frameworks
- ✅ No hallucinations, no forgotten context

### **2. Adaptive Thinking — Intelligence That Matches Complexity**

Opus 4.6 dynamically decides _how much to think_ based on your case complexity.

- **Simple visa question?** → ⚡ Fast answer (minimal thinking)
- **Complex asylum case with 5 nationality claims?** → 🧠 Deep reasoning
- Users see the thinking process in real-time, building trust

### **3. Four Specialized AI Agents Working in Parallel**

FreePath deploys **4 expert agents** to break down immigration into manageable
parts:

1. **Pathway Strategist** → "What are my realistic visa options?"
2. **Eligibility Analyst** → "Do I qualify for this visa type?"
3. **Documentation Specialist** → "What exact documents do I need?"
4. **Application Manager** → "How long will it take? When should I apply?"

Each agent has its own specialized prompt and reasoning style. They work
**in parallel** and combine insights into a single actionable guide.

### **4. Personalized for YOUR Context**

- ✅ Your origin country (citizenship)
- ✅ Your destination country (where you want to go)
- ✅ Your nationality/ies
- ✅ Your migration reason (work, family, asylum, study, business, etc.)

**The result**: Customized pathway + document checklist + timeline + next
steps—all in your language.

---

## ⚡ Key Features

- **Smart Form Filling** — AI pre-fills government forms based on context
- **Dynamic Checklists** — Generates exact documents needed + tracking
- **Timeline Estimation** — Processing times, appointment scheduling, milestones
- **Multi-Language Support** — 15 languages with full RTL support
- **Real-Time Progress** — Watch agents work, see token usage, visible thinking
- **No Legal License Needed** — Guidance is educational, not legal advice
- **Fully Open Source** — MIT licensed, completely transparent

---

## 🛠 Tech Stack

| Component | Technology          | Why?              |
| --------- | ------------------- | ----------------- |
| Backend   | Rails 8 + Postgres  | Rapid development |
| Frontend  | React 19 + Tailwind | Real-time UI      |
| AI        | Claude Opus 4.6     | Legal reasoning   |
| Real-Time | Action Cable + SSE  | Streaming         |

**Architecture**:

```text
Frontend (React 19 + Vite, port 5173)
    ↓ proxies /api & /cable
Backend (Rails 8 API, port 3000)
    ├→ Chat Controller (SSE streaming)
    ├→ Legislation Crawler (Claude-powered progressive saving)
    ├→ 4 Agent Endpoints (specialized prompts)
    ├→ Database (PostgreSQL)
    │   ├── Countries table
    │   └── Legislations table (versioning + deprecation)
    └→ Background Jobs (Sidekiq)
        ├── Content extraction
        └── Token counting
```

**Key architectural insight**: **Progressive streaming** — Results appear as
computed, not waiting for full response. Users see progress immediately.

---

## ✅ What's Built

### Currently Implemented

- ✅ Full chat interface with 4 specialized agents
- ✅ Legislation crawler with real-time streaming progress
- ✅ Real-time UI with agent progress tracking + thinking blocks
- ✅ Multi-language support (15 languages with RTL)
- ✅ Admin dashboard with crawl status & metrics
- ✅ Responsive design (mobile + desktop)
- ✅ Full i18n with RTL support
- ✅ Production-ready error handling & graceful degradation

---

## 🏗️ Architecture Overview

### Frontend Architecture

- **State Management**: Zustand store for chat history + user selections
- **Components**: 30+ React components (chat, progress, agent cards)
- **UI Library**: Radix UI + shadcn/ui for accessibility
- **Styling**: Tailwind CSS 4 with logical properties (RTL-ready)
- **Real-Time**: Action Cable consumer + custom hooks

### Backend Architecture

- **Agents**: Base class + 4 specialists (Strategist, Analyst, Specialist,
  Manager)
- **Legislation Crawler**: Streaming service with progressive database saves
- **SSE Streaming**: Real-time updates to frontend
- **Database**: Countries + Legislations (with versioning & deprecation)
- **Background Jobs**: Sidekiq for long-running tasks

---

## 🌐 Internationalization (i18n)

All user-facing text goes through the `t()` function. Every visible string is
translated into **15 languages**, with full RTL support:

**Left-to-Right (LTR) — 11 languages**:

- 🇧🇷 **Portuguese (pt-BR)**
- 🇬🇧 **English (en)**
- 🇧🇩 **Bengali (bn)**
- 🇵🇭 **Filipino (fil)**
- 🇫🇷 **French (fr)**
- 🇮🇳 **Hindi (hi)**
- 🇮🇩 **Indonesian (id)**
- 🇨🇳 **Chinese (zh)**
- 🇷🇺 **Russian (ru)**
- 🇪🇸 **Spanish (es)**
- 🇺🇦 **Ukrainian (uk)**

**Right-to-Left (RTL) — 4 languages**:

- 🇸🇦 **Arabic (ar)**
- 🇦🇫 **Pashto (ps)**
- 🇦🇫 **Dari (dar)**
- 🇵🇰 **Urdu (ur)**

**Features**:

- 🔄 Auto-detects browser locale on first visit
- 🔑 All locales use the same translation keys (full parity)
- 📱 Responsive design with complete RTL support (logical CSS)
- 📚 See [i18n-glossary](./frontend/src/lib/i18n-glossary.md) for meaning

---

## 📊 Innovation Highlights: Why Opus 4.6?

### **1M Token Context**

- Load entire country's immigration legislation at once
- 76% retrieval accuracy (vs 18.5% previous generation)
- No "context rot" when reasoning across 100+ documents

### **Adaptive Thinking (4 Levels)**

- Model chooses reasoning depth based on problem complexity
- Trivial visa questions → instant answers
- Complex multi-nationality cases → deep strategic reasoning
- **Visible to users** — builds trust, shows the AI is "thinking hard"

### **Agentic Capabilities**

- 4 agents work independently with specialized expertise
- Self-correcting with Claude's tool use
- Terminal-Bench 2.0: **65.4%** (industry-leading agentic reasoning)
- Computer use: **72.7%** (ability to interact with interfaces)
- Sustains multi-step processes without user intervention

### **128K Output Tokens**

- Generate comprehensive immigration guides in single response
- Double previous limits = better for complex multi-country scenarios

---

## 📝 Open Source

**License**: MIT (fully open source)

This project is 100% open source. Everything is published under the MIT
license:

- ✅ Backend code
- ✅ Frontend code
- ✅ Database schemas
- ✅ Agent prompts
- ✅ Legislation data (as crawled)

You're free to use, modify, and redistribute FreePath for any purpose.

**Contribution guidelines**: See
[.claude/docs/git-conventions.md](./.claude/docs/git-conventions.md)

**Report issues**: Create a GitHub issue in this repository

---

## 🌟 FreePath's Vision: Breaking Barriers at Scale

### Why This Matters

Immigration is a human right. Access to guidance shouldn't depend on your wealth.

**Status quo**: Only wealthy immigrants can afford lawyers. Poor immigrants make
mistakes.

**FreePath's change**: Remove cost barriers. Remove expertise barriers. Remove
language barriers.

### FreePath in 5 Years

- 🌍 **50+ countries** covered (every major migration destination)
- 🗣️ **20+ languages** (covering 95% of global migrants)
- 👥 **1M+ users** helped avoid costly mistakes
- 📋 **Form automation** — integrated with actual government portals
- 🤝 **Optional lawyer marketplace** — human expertise available (but optional)

### The Bigger Picture

Immigration shapes lives. Careers. Families. Safety. Yet most immigrants navigate
bureaucratic systems alone, scared, unsure.

**FreePath uses AI to:**

- Democratize expert knowledge (1M token context ingests entire legal frameworks)
- Adapt to complexity (adaptive thinking matches case difficulty)
- Be accessible (free, multi-language, no technical skill required)
- Restore agency (immigrants make informed decisions, not blind guesses)

---

## 🏆 Hackathon Details

- **Event**: Anthropic Virtual Hackathon 2026
- **Team Size**: Up to 2 members
- **Track**: "Break the Barriers" — Take expert knowledge locked behind barriers
  and put it in everyone's hands
- **Dates**: Feb 15-18, 2026
- **Judging**: Asynchronous (Feb 16-17) + Live final round (Feb 18, 12PM EST)
- **Judging Criteria**: Impact (25%) • Opus 4.6 Use (25%) • Depth (20%) •
  Demo (30%)

---

## 📖 Key Documentation

- [CLAUDE.md](./CLAUDE.md) — Development guidelines & conventions
- [.claude/docs/git-conventions.md](./.claude/docs/git-conventions.md) — Git
  commit standards
- [.claude/docs/clean-code.md](./.claude/docs/clean-code.md) — Code style
  guide
- [.claude/docs/design-system.md](./.claude/docs/design-system.md) — Design
  tokens & RTL rules
- [frontend/src/lib/i18n-glossary.md](./frontend/src/lib/i18n-glossary.md) —
  Translation glossary

---

## Final Note

**Breaking barriers to immigration guidance, one AI-powered answer at a time.**

Made with ❤️ for the Anthropic Virtual Hackathon 2026

### License: MIT
