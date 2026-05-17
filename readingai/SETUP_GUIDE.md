# FourG Reading AI - Google Cloud TTS Setup Guide

## Overview
This guide will help you set up and run the FourG Reading AI application with Google Cloud Text-to-Speech integration.

## Prerequisites
- Python 3.10 or higher
- Google Cloud service account with Text-to-Speech API enabled
- Modern web browser

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd readingai/bookworm
```

### 2. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Service Account
- Place your Google Cloud service account key JSON file in `readingai/bookworm/`
- Rename it to `service-account-key.json`
- The service account should have Text-to-Speech API permissions

### 5. Set Up Environment Variables
```bash
cp .env.example .env
```

The `.env` file should contain:
```
GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json
PORT=5000
FLASK_ENV=development
```

### 6. Start the Backend Server
```bash
python app.py
```

The server will start on `http://localhost:5000`

## Frontend Setup

### 1. Open the Application
Open `readingai/frontend/index.html` in your web browser, or use a local server:

```bash
# Using Python's built-in server
cd readingai/frontend
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000`

### 2. Configuration
The frontend is already configured to use the backend at `http://localhost:5000`

## Testing the Integration

### Test Backend Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "service": "FourG TTS Service",
  "status": "healthy"
}
```

### Test Speech Synthesis
```bash
curl -X POST http://localhost:5000/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}' \
  --output test.mp3
```

### Test in Browser
1. Open the application in your browser
2. The TTS functionality will automatically use Google Cloud TTS
3. If the backend is unavailable, it will fallback to browser's built-in speech synthesis

## API Endpoints

### Health Check
- **URL**: `GET /health`
- **Response**: `{"status": "healthy", "service": "FourG TTS Service"}`

### Synthesize Speech
- **URL**: `POST /api/tts/synthesize`
- **Body**:
  ```json
  {
    "text": "Text to synthesize",
    "rate": 0.85,  // optional, default 1.0
    "pitch": 0,    // optional, default 0
    "voice_name": "en-US-Neural2-F"  // optional
  }
  ```
- **Response**: MP3 audio file

### Synthesize Speech (Slow)
- **URL**: `POST /api/tts/synthesize-slow`
- **Body**:
  ```json
  {
    "text": "Word to pronounce",
    "rate": 0.5  // optional, default 0.5
  }
  ```
- **Response**: MP3 audio file

### List Available Voices
- **URL**: `GET /api/tts/voices`
- **Response**: JSON array of available English voices

## Troubleshooting

### Backend won't start
- Ensure Python 3.10+ is installed
- Verify virtual environment is activated
- Check that all dependencies are installed
- Verify service account key file exists and is valid

### TTS not working in frontend
- Ensure backend server is running on port 5000
- Check browser console for errors
- Verify CORS is properly configured
- Test backend endpoints directly with curl

### Audio quality issues
- Adjust `rate` and `pitch` parameters in API calls
- Try different voice names (use `/api/tts/voices` endpoint)
- Check network connection speed

## Production Deployment

For production deployment:

1. Update `.env` with production settings
2. Use a production WSGI server (gunicorn is included):
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```
3. Set up proper CORS origins in `.env`
4. Use environment variables for sensitive data
5. Consider using Google Cloud Secret Manager
6. Set up SSL/TLS certificates
7. Configure firewall rules

## Security Notes

- Never commit `service-account-key.json` to version control
- Use environment variables for all sensitive configuration
- Restrict service account permissions to minimum required
- Implement rate limiting in production
- Use HTTPS in production

## Support

For issues or questions, refer to:
- Google Cloud TTS Documentation: https://cloud.google.com/text-to-speech/docs
- Flask Documentation: https://flask.palletsprojects.com/