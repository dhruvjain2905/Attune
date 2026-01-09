# Attune
**An AI-powered system for gently aligning attention with intention.**

Attune helps you understand how your attention moves during focused work. Instead of rigid time tracking or manual categorization, Attune observes your screen activity and uses AI to detect moments of misalignment between what you intended to do and what you're actually doing.

When that misalignment becomes clear, Attune offers a subtle nudge—not to enforce discipline, but to restore awareness.

The goal isn't control. It's alignment.

---

## What Attune Does

Attune periodically captures screenshots of your desktop and analyzes them to determine whether your current activity aligns with your stated goal.

- If you remain on-task, Attune stays silent.
- If clear distraction is detected, Attune sends a gentle notification.
- When uncertainty exists, Attune defaults to *focused*.

After each session, Attune provides reflective analytics:
- When and how often your attention drifted
- The types of distractions that appeared
- How your focus changed over time

These insights are designed to support understanding—not judgment.

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) - Fast Python package installer and runner
- [Ollama](https://ollama.ai/) installed locally
- Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/attune.git
   cd attune
   ```

2. **Pull the vision model**
   ```bash
   ollama pull qwen3-vl:2b
   ```

3. **Configure environment variables**
   
   Create a `.env` file in `backend/`:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running Attune

1. **Start the backend**
   ```bash
   cd backend
   uv run app.py
   ```

2. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the app**
   
   Navigate to http://localhost:5173

---

## How to Use

1. Start a new session and define your intended task
2. Work as usual while Attune runs quietly in the background
3. If your attention clearly diverges from your goal, you'll receive a subtle nudge
4. End the session to review your focus patterns and analytics

---

## Technology & Design Philosophy

### Tech Stack

**Backend**
- FastAPI – Modern Python API framework
- Qwen 3-VL (2B) – Local vision model via Ollama for screenshot interpretation
- Claude Sonnet 4 – Large language model for contextual focus classification
- SQLite – Lightweight session persistence
- uv – Fast Python package management and execution

**Frontend**
- React
- Vite
- TailwindCSS
- React Router

### Why Attune Exists

Most productivity tools assume attention is something to be enforced.

Attune treats attention as something to be observed.

By combining local computer vision with goal-aware language models, Attune builds a high-level understanding of what's on your screen and whether it aligns with your stated intention. The system intervenes sparingly, prioritizing awareness over correction.

This hybrid AI approach balances:
- **Privacy** — screenshots are interpreted locally
- **Nuance** — higher-level reasoning is delegated to language models
- **Restraint** — Attune defaults to focus when uncertain

Attune is built for developers, writers, students, and researchers who want to understand their attention patterns and build better work habits—without surveillance or guilt.

---

## License

MIT License

---

## Contributing

Issues and pull requests are welcome. Attune is a learning-oriented project, and feedback on system design, AI prompting, UX, or the ethics of attention-aware systems is especially appreciated.
