# MichiganReads AI (BookWorm)

An AI-powered reading tutoring platform for Michigan elementary school students (grades 3–7). Students read passages and books aloud and receive real-time feedback on accuracy, fluency, and comprehension. Teachers get a full dashboard with analytics, book management, and live class activity.

---

## Features

### Students
- Read passages or books aloud and get instant pronunciation feedback
- Word-level scoring with highlighted problem words (below 75% accuracy)
- Phonics focus sections based on spelling pattern struggles
- Comprehension questions after each reading session
- Progress tracking with visual charts and streak counter
- Bookworm AI tutor — conversational feedback and reading tips (powered by IBM Granite 4)
- Voice input for Bookworm conversations
- Bilingual interface (English / Spanish)
- Audio playback of your own reading

### Teachers
- Manage multiple classes with class codes
- Add books from ReadWorks, Epic!, CommonLit, or Project Gutenberg
- Assign and rotate books across classes
- Real-time analytics: live activity, score trends, difficult words across class
- Student detail view with full reading history and teacher notes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python 3.10+, Flask |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Speech Recognition | Microsoft Azure Speech Services |
| Text-to-Speech | Google Cloud TTS |
| AI Tutor | IBM watsonx Granite 4 |
| Conversation Summaries | Groq (Llama 3.1) |
| Charts | Chart.js |

---

## Project Structure

```
FourG/
├── readingai/
│   ├── frontend/          # Single-page web app
│   │   ├── index.html
│   │   ├── config.js      # API config (see setup)
│   │   ├── css/styles.css
│   │   └── js/            # Modular JS (app, auth, teacher, bookworm, etc.)
│   └── bookworm/          # Python Flask backend (TTS proxy)
│       ├── app.py
│       ├── requirements.txt
│       └── .env.example
├── supabase/              # Supabase local dev config + Edge Functions
│   ├── config.toml
│   └── functions/
│       ├── get-ibm-token/
│       ├── ibm-chat/
│       └── fetch-gutenberg/
└── docs/                  # Marketing/landing page
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js (for local static server)
- A [Supabase](https://supabase.com) project
- API keys for: Azure Speech, Google Cloud TTS, IBM watsonx, Groq

### 1. Backend (TTS Proxy)

```bash
cd readingai/bookworm
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your Google Cloud service account key as service-account-key.json
python app.py
# Runs on http://localhost:5000
```

### 2. Frontend

Create `readingai/frontend/config.js` with your API keys (use `.env.example` as a reference). Then serve the frontend locally:

```bash
cd readingai/frontend
python3 -m http.server 8000
# Navigate to http://localhost:8000
```

### 3. Supabase (optional local dev)

```bash
supabase start   # Starts local Postgres + Studio
supabase stop
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/tts/synthesize` | Synthesize speech with custom rate/pitch/voice |
| POST | `/api/tts/synthesize-slow` | Synthesize at 0.5× speed for word practice |
| GET | `/api/tts/voices` | List available English voices |

---

## Environment Variables

Backend variables go in `readingai/bookworm/.env`:

```
GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json
PORT=5000
FLASK_ENV=development
```

Frontend API keys go in `readingai/frontend/config.js`. **Never commit this file** — it is listed in `.gitignore`.

---

## Privacy & Compliance

This application is designed to comply with COPPA, FERPA, and the Michigan Student Data Privacy Act. No student data is sold or shared with third parties.

---

## Contributing

1. Create a feature branch off `main`
2. Open a pull request with a description of your changes
3. Request a review before merging
