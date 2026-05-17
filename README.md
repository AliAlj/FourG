<div align="center">

<img src="readingai/frontend/assets/wormAi.png" alt="Bookworm AI" width="100" />

# MichiganReads AI

### AI-powered reading tutor for Michigan K–8 students

**Built in 48 hours at [HackMichigan 2026](https://www.hackmichigan.dev) · TechTown Detroit**

[![Track](https://img.shields.io/badge/Track-Michigan%20Education-1a3a5c?style=for-the-badge)](https://github.com/AliAlj/FourG)
[![License](https://img.shields.io/badge/License-MIT-2e7d32?style=for-the-badge)](LICENSE)
[![Made in Michigan](https://img.shields.io/badge/Made%20in-Michigan-f0a500?style=for-the-badge)](#)

[🚀 Live Demo](https://fourg-1.onrender.com) · [📖 Docs](#setup) · [🎥 Demo Video](#)

</div>

---

## The Problem

Nearly **two-thirds of Michigan third graders** are not reading at grade level. Teachers can't give every student individualized feedback. Private tutors are out of reach for most families. Existing edtech tools present content — but never listen.

**MichiganReads AI listens.**

---

## What It Does

Students open the app, pick a book, and read aloud. The app scores every word in real time and connects them to **Bookworm** — an AI tutor that knows exactly where they struggled and coaches them personally.

<table>
<tr>
<td width="50%">

### 🎓 For Students
- Read passages & illustrated books aloud
- Word-level pronunciation scoring
- Highlighted problem words (< 75% accuracy)
- Comprehension questions after each session
- Progress charts & reading streak tracker
- **Bookworm AI tutor** — voice or text
- Bilingual: English & Spanish

</td>
<td width="50%">

### 👩‍🏫 For Teachers
- Create classes with join codes
- Assign books with due dates
- Live activity feed — see who's reading now
- Analytics: score trends, difficult words
- Student drill-downs with full history
- AI-generated weekly progress summaries

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|---|---|
| 🎤 Speech Recognition | Microsoft Azure Speech Services |
| 🤖 AI Tutor | IBM watsonx Granite 4 |
| 🔊 Text-to-Speech | Google Cloud TTS |
| 📝 Summaries | Groq — Llama 3.1 |
| 🗄️ Database & Auth | Supabase (PostgreSQL) |
| ⚙️ Backend | Python 3.10+ / Flask |
| 🌐 Frontend | HTML5 · CSS3 · Vanilla JS |
| 📊 Charts | Chart.js |

---

## Michigan Library

The built-in passage library is written for Michigan students — not generic content.

| Grade | Title | Topic |
|---|---|---|
| 3 | Eastern Market: The Heart of Detroit | Detroit History |
| 3 | The Sleeping Bear Dunes | Michigan Nature |
| 3 | The Gray Wolf Returns to Michigan | Animals |
| 4 | Michigan's Greatest Treasure | Great Lakes |
| 4 | How Detroit Built the American Dream | Michigan Industry |
| 5 | Detroit and the Road to Freedom | Civil Rights |
| 6 | Dearborn: Michigan's Arab American Capital | Community |
| 7 | Motown: The Sound That Changed America | Michigan History |

Plus **9 illustrated books** for grades 1–4 (Peter Rabbit, Goldilocks, Three Little Pigs, and more).

---

## Project Structure

```
FourG/
├── readingai/
│   ├── frontend/          # Single-page web app
│   │   ├── index.html
│   │   ├── css/styles.css
│   │   └── js/            # app, auth, teacher, bookworm, library...
│   └── bookworm/          # Python Flask backend (TTS proxy)
│       ├── app.py
│       └── requirements.txt
├── supabase/              # Edge Functions + local dev config
│   └── functions/
│       ├── get-ibm-token/
│       ├── ibm-chat/
│       └── fetch-gutenberg/
└── docs/                  # Marketing landing page
```

---

## Setup

### Prerequisites
- Python 3.10+
- A [Supabase](https://supabase.com) project
- API keys: Azure Speech · Google Cloud TTS · IBM watsonx · Groq

### 1. Backend

```bash
cd readingai/bookworm
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py            # → http://localhost:5000
```

### 2. Frontend

```bash
cd readingai/frontend
python3 -m http.server 8000   # → http://localhost:8000
```

> Add your API keys to `readingai/frontend/config.js` — **never commit this file.**

### 3. Supabase (optional local dev)

```bash
supabase start    # Postgres + Studio on local ports
supabase stop
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/tts/synthesize` | Synthesize speech |
| `POST` | `/api/tts/synthesize-slow` | 0.5× speed for word practice |
| `GET` | `/api/tts/voices` | List available voices |

---

## Privacy & Compliance

Designed to comply with **COPPA**, **FERPA**, and the **Michigan Student Data Privacy Act**. No student data is sold or shared with third parties. Bilingual (English/Spanish) to serve all Michigan families.

---

## Contributing

```bash
git checkout -b feature/your-feature
# make changes
git push origin feature/your-feature
# open a pull request → main
```

---

<div align="center">

Built with ❤️ in Detroit · HackMichigan 2026 · [COMPASS Detroit](https://compass-detroit.com)

</div>
