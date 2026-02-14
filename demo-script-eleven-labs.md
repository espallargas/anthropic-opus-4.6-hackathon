# Immigration Navigator Demo Script - 3 Minutes
## Eleven Labs v3 with Proper Markup

---

### **[0:00-0:25] SLIDE 1: THE CRISIS**

**VISUAL:** Digital clock, displacement map, "$20.5B market", "67% no lawyer", "1 in 3 PTSD"

**SCRIPT:**

[fast] [thoughtful] Every single minute, 234 people are forcibly displaced. By the time this demo ends, 700 more will have fled war, persecution, or disaster.

[fast] [grave] Most face a legal maze in a language they don't speak — 67% without a lawyer. The immigration legal services market is worth $20.5 billion — built for those who can afford $15,000 per case.

[fast] [somber] And it destroys mental health. One in three refugees develops PTSD or depression. Long asylum procedures double psychiatric disorders… [fast] [determined] We built Immigration Navigator to break this cycle.

---

### **[0:25-0:30] SLIDE 1.5: COUNTRIES IN CRISIS**

**VISUAL:** World map + crisis dashboard

**SCRIPT:**

[fast] [grave] These are the countries facing crisis right now.

**ON SCREEN (don't read):**
- 🇸🇩 Sudan: 14.3M | 🇸🇾 Syria: 13.9M | 🇦🇫 Afghanistan: 8.2M | 🇺🇦 Ukraine: 6.3M | 🇻🇪 Venezuela: 6.1M | 🇸🇸 S. Sudan: 4.4M | 🇨🇩 DRC: 6.7M | 🇾🇪 Yemen: 4.5M

---

### **[0:30-0:55] SLIDE 2: THE SOLUTION**

**VISUAL:** Split screen (chaos → clean UI), Opus 4.6 badge, multi-agent diagram

**SCRIPT:**

[fast] [thoughtful] Immigration Navigator is an AI-powered immigration guide. [fast] [rushed] None of this would be possible without Claude Opus 4.6.

[fast] We built a multi-agent system: three orchestrator agents coordinate five specialized experts — a Regulatory Researcher, Pathway Strategist, Eligibility Analyst, Documentation Specialist, and Application Manager. [fast] [rushed] They work together to analyze your unique situation and build your immigration roadmap.

[fast] The 1-million-token context means we load entire legal frameworks into memory. [fast] [rushed] Adaptive thinking adjusts depth automatically. The result: instant, accurate, multilingual guidance that gives people clarity and a real starting point.

---

### **[0:55-1:20] SLIDE 3A: SIMPLE DEMO**

**VISUAL:** Interface showing 4-step setup → chat

**SCRIPT:**

[fast] [excited] Let me show you. Every conversation starts with four questions.

[fast] [casual] João from São Paulo — tourism visa to New York. Straightforward.

[fast] [curious] Watch Adaptive Thinking recognize this is low complexity — it stays fast.

[fast] [neutral] Simple case, fast answer. But complexity changes everything.

---

### **[1:20-2:15] SLIDE 3B: COMPLEX DEMO**

**VISUAL:** New chat, thinking indicator (low→high→max)

**SCRIPT:**

[fast] [somber] Now Maria — Venezuelan asylum seeker fleeing violence. Completely different.

[fast] [grave] Maria asks: "What do I need to apply for asylum in the United States?"

[fast] [rushed] ADAPTIVE THINKING kicks in automatically… shifting to maximum depth. [fast] [thoughtful] Claude knows this is complex asylum law requiring deep analysis.

[fast] Here's the breakthrough: the 1-MILLION-TOKEN CONTEXT WINDOW lets us load the entire US asylum legal framework into memory — [fast] [rushed] INA statutes, credible fear standards, Venezuelan country condition precedents, DHS policy memos.

[fast] [neutral] No RAG retrieval errors. No slow searches. [fast] [emphasized] Everything Claude needs is already in context — that's what makes this possible.

[fast] [optimistic] Maria gets her roadmap: I-589 requirements, documentary evidence, filing deadlines, relevant case law — [fast] [rushed] all customized to Venezuelan asylum claims, all in Spanish if she needs it.

---

### **[2:15-2:35] SLIDE 4: MULTILINGUAL**

**VISUAL:** Language grid (Global Reach + Crisis Zones), "60% population • 80%+ displaced"

**SCRIPT:**

[fast] [neutral] We localized into 15 languages — Spanish, Mandarin, Arabic, English, Russian, Portuguese, French, Hindi, Indonesian… [fast] [rushed] plus crisis languages: Ukrainian, Dari, Pashto, Bengali, Urdu, Filipino.

[fast] [emphasized] Together, they reach 60% of the world's population and over 80% of forcibly displaced people.

---

### **[2:35-3:00] SLIDE 5: IMPACT**

**VISUAL:** Before/After, GitHub badge, Opus 4.6 logo, demo URL

**SCRIPT:**

[fast] [sobering] 2.5 million people with no representation. Asylum seekers waiting in fear, not knowing where to start.

[fast] [passionate] We're giving them immediate clarity, a real roadmap, and the confidence to begin.

[fast] [fast] In their language. [fast] [rushed] Fully open source. [fast] [triumphant] Powered by Opus 4.6. Thank you.

---

## **ELEVEN LABS V3 MARKUP REFERENCE**

### **Pacing Control (ALWAYS USED):**
- `[fast]` — Controls speech rate, ensures content fits timing
- **Usage:** Applied before most phrases/sentences for consistent pacing
- **Strategy:** Prevents natural speech rhythm from exceeding 3-minute window

### **Emotional & Voice Tags (APPLIED BY CRITICALITY):**

**Serious/Grave Content (Problem Statement):**
- `[thoughtful]` — Reflective, contemplative tone
- `[grave]` — Serious, weighty tone
- `[somber]` — Dark, serious mood
- `[determined]` — Resolute, committed tone

**Demo/Solution Content:**
- `[excited]` — Higher energy, enthusiasm (demo intro)
- `[neutral]` — Natural, balanced delivery
- `[casual]` — Relaxed, conversational tone
- `[curious]` — Questioning, interested tone
- `[optimistic]` — Hopeful, positive delivery

**Technical Reveals/Emphasis:**
- `[rushed]` — Accelerated delivery for important technical details
- `[emphasized]` — Strong, powerful delivery for key breakthroughs
- `[thoughtful]` — Measured tone for complex explanations

**Impact/Conclusion:**
- `[sobering]` — Serious, thought-provoking
- `[passionate]` — Intense, emotionally driven
- `[triumphant]` — Victorious, celebratory tone

### **Tag Combination Strategy:**
- **Always start with `[fast]`** — Ensures pacing control
- **Follow with emotional tag** — Sets tone/criticality
- **Optional `[rushed]`** — For key technical revelations (used strategically)
- **Example:** `[fast] [thoughtful] This is important context.`
- **Example:** `[fast] [rushed] Technical detail here.`

### **Pause Control in v3:**
- **Ellipses (`…`)** — Use instead of `<break>` tags
- Example: `"ADAPTIVE THINKING kicks in automatically… shifting to maximum depth"`
- **Punctuation** — Dashes (`—`) and commas create natural rhythm
- **Capitalization** — `ADAPTIVE THINKING`, `1-MILLION-TOKEN CONTEXT` for emphasis

### **Formatting Rules:**
✅ All tags use square brackets: `[tag]`
✅ Always use `[fast]` first for pacing control
✅ Follow with emotional/criticality tag
✅ Place tags at the beginning of sentences or major phrases
✅ Keep original text intact — tags modify delivery, not content
✅ Combine tags: `[fast] [thoughtful]` for pacing + tone
❌ No XML/SSML break tags — v3 doesn't support them
❌ No phoneme annotations — use natural language

---

## **TIMING BREAKDOWN**

| Slide | Duration | Content |
|-------|----------|---------|
| 1 | 0:00-0:25 (25s) | Crisis statistics & impact |
| 1.5 | 0:25-0:30 (5s) | Countries context |
| 2 | 0:30-0:55 (25s) | Solution & Opus 4.6 |
| 3A | 0:55-1:20 (25s) | Simple demo (João) |
| 3B | 1:20-2:15 (55s) | Complex demo (Maria) |
| 4 | 2:15-2:35 (20s) | Multilingual support |
| 5 | 2:35-3:00 (25s) | Impact & conclusion |
| **TOTAL** | **~180s (3 min)** | ✅ Perfect fit |

---

## **USAGE INSTRUCTIONS**

1. **Copy the SCRIPT sections** (only the dialogue text with `[tags]`)
2. **Paste into Eleven Labs v3 TTS interface**
3. **Select a voice** (neutral voices work best for demo narration)
4. **Generate audio** and listen
5. **Adjust tags if needed** — if something feels too fast, change `[neutral]` to `[casual]`; if too slow, use `[excited]`
6. **Test with actual visual timing** to synchronize narration with slides

---

## **COMPRESSION SUMMARY**

✅ Removed redundant stats (kept "234 every minute" vs "14,000 every hour")
✅ Simplified market explanation (kept $20.5B + $15,000 per case)
✅ Rewrote agent list for natural flow
✅ Trimmed João setup description
✅ Streamlined context window explanation (kept technical detail)
✅ Used ellipses for pauses instead of break tags
✅ Added emotional tags for natural pacing & delivery

**Result: Professional 3-minute narration ready for Eleven Labs v3 TTS**
