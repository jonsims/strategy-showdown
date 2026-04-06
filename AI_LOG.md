# AI Activity Log — Strategy Showdown

## 2026-04-06 — Initial Build and Iterative Redesign

**Session summary:** Built the Strategy Showdown app from scratch across three major iterations in a single session, guided by a multi-agent advisory panel.

### Iteration 1: Initial Build
- Created Express server with three-phase classroom app (Place Your Bet, Moonshot Moment, Fund It or Kill It)
- Mobile-first design with student view, admin panel, and projector display
- Deployed to GitHub (`jonsims/strategy-showdown`) and configured for Render
- Seeded with realistic dummy data (16 students, 6 teams, all three phases populated)

### Iteration 2: Reliability + Pedagogy Improvements
Based on feedback from seven simulated advisors (strategy prof, ecology prof, OB prof, UI designer, reliability engineer, two students):

**Reliability fixes:**
- State persistence via `state.json` (crash recovery)
- Phase advance cooldown (prevents double-click skipping phases)
- Late joiner handling (graceful missed-phase messages)
- Identity bar with "Not you?" switch for shared devices

**Pedagogical improvements:**
- Leverage level dropdown (Fischer & Riechers: Parameters/Feedbacks/Design/Intent)
- Required "Who bears the cost?" field in moonshot form
- Self-funding cap at 25 points (prevents loyalty voting)
- Full moonshot cards in Phase 3 funding view
- Delayed Phase 1 results reveal until 75% submitted

### Iteration 3: Laptop Redesign + Contextual Guidance
Decision to target laptops instead of phones led to complete UI rewrite:

**Student view:**
- Two-panel layout (60% activity / 40% context+live results)
- Guidance boxes on every phase explaining what/why/how with case-specific references
- Key Case Numbers reference panel (17 figures with page references)
- Live mini-display showing real-time class results
- Range sliders for Phase 3 funding allocation

**Display view:**
- Phase-specific case context lines
- Split-team detection with SPLIT badges
- Leverage level badges and cost bearer on moonshot cards
- Discussion prompt on final results

**Admin view:**
- Phase transition guidance for instructor
- Split team flags for cold-calling
- Leverage + cost bearer columns in moonshots table

### Files reviewed
- server.js, package.json, public/index.html, public/admin.html, public/display.html, render.yaml

### Files created/updated
- All of the above + CLAUDE.md, AI_LOG.md, .gitignore, state.json (auto-generated)

### Recommended next actions
- Complete Render deployment (manual step: connect repo in Render dashboard)
- Test with actual students in a dry run before class
- Consider implementing "nice-to-have" improvements: countdown timer between phases, staggered final ranking reveal, case number dropdowns instead of free text
- The Session 20 Plan.md in the parent directory references this tool — keep them in sync
