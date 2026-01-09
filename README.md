# Attune
**An AI-powered system for gently aligning attention with intention.**

Attune helps you understand how your attention moves during focused work. Instead of rigid time tracking or manual categorization, Attune observes your screen activity and uses AI to detect moments of misalignment between what you intended to do and what you're actually doing.

When that misalignment becomes clear, Attune offers a subtle nudge, restoring awareness.

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

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/getting-started/installation/#standalone-installer) - Fast Python package installer and runner
- [Ollama](https://ollama.ai/) installed locally
- Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dhruvjain2905/Attune.git
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

### Other Remarks

Attune uses a  hybrid AI approach balancing:
- **Privacy** — screenshots are first interpreted locally through Qwen's VLM and are deleted immediately
- **Nuance** — higher-level reasoning is then delegated to cloud language models through Claude API
- **Restraint** — Attune only nudges when absolutely sure of distraction

Attune is built for developers, writers, students, and researchers who want to understand their attention patterns and build better work habits. 

---

## License

MIT License

---

## Contributing

Issues and pull requests are welcome. Thank you!
