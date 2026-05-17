from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from google.cloud import texttospeech
from dotenv import load_dotenv
import io
import os
import requests


load_dotenv()

app = Flask(__name__)
CORS(app)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "service-account-key.json",
)

try:
    tts_client = texttospeech.TextToSpeechClient()
except Exception:
    tts_client = None


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "FourG TTS Service"}), 200


@app.route("/api/tts/synthesize", methods=["POST"])
def synthesize_speech():
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        rate = data.get("rate", 1.0)
        pitch = data.get("pitch", 0)
        voice_name = data.get("voice_name", "en-US-Neural2-F")

        if not text:
            return jsonify({"error": "Text is required"}), 400
        if not tts_client:
            return jsonify({"error": "TTS not configured"}), 503

        response = tts_client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=text),
            voice=texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name=voice_name,
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=rate,
                pitch=pitch,
            ),
        )

        audio_stream = io.BytesIO(response.audio_content)
        audio_stream.seek(0)
        return send_file(
            audio_stream,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/tts/synthesize-slow", methods=["POST"])
def synthesize_speech_slow():
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        rate = data.get("rate", 0.5)

        if not text:
            return jsonify({"error": "Text is required"}), 400
        if not tts_client:
            return jsonify({"error": "TTS not configured"}), 503

        response = tts_client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=text),
            voice=texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-F",
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=rate,
                pitch=0,
            ),
        )

        audio_stream = io.BytesIO(response.audio_content)
        audio_stream.seek(0)
        return send_file(
            audio_stream,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/tts/voices", methods=["GET"])
def list_voices():
    if not tts_client:
        return jsonify({"error": "TTS not configured"}), 503
    try:
        voices = tts_client.list_voices()
        english_voices = [
            {
                "name": voice.name,
                "language_codes": list(voice.language_codes),
                "gender": texttospeech.SsmlVoiceGender(voice.ssml_gender).name,
            }
            for voice in voices.voices
            if "en-US" in voice.language_codes
        ]
        return jsonify({"voices": english_voices}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/bookworm", methods=["POST"])
def bookworm_chat():
    try:
        data = request.get_json() or {}
        system = data.get("system", "")
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 120)

        ibm_api_key = os.getenv("IBM_API_KEY")
        wx_url = os.getenv("WX_URL", "https://us-south.ml.cloud.ibm.com")
        model_id = os.getenv("MODEL_ID", "ibm/granite-3-8b-instruct")
        project_id = os.getenv("IBM_PROJECT_ID")

        token_res = requests.post(
            "https://iam.cloud.ibm.com/identity/token",
            data=f"grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={ibm_api_key}",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = token_res.json().get("access_token")

        wx_res = requests.post(
            f"{wx_url}/ml/v1/text/chat?version=2023-05-29",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "model_id": model_id,
                "messages": [{"role": "system", "content": system}] + messages,
                "project_id": project_id,
                "max_tokens": max_tokens,
                "parameters": {"temperature": 0.7},
            },
        )
        reply = wx_res.json()["choices"][0]["message"]["content"].strip()
        return jsonify({"reply": reply}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/generate-passage", methods=["POST"])
def generate_passage():
    try:
        data = request.get_json() or {}
        title = data.get("title", "")
        author = data.get("author", "the author")
        description = data.get("description", "")

        ibm_api_key = os.getenv("IBM_API_KEY")
        wx_url = os.getenv("WX_URL", "https://us-south.ml.cloud.ibm.com")
        model_id = os.getenv("MODEL_ID", "ibm/granite-3-8b-instruct")
        project_id = os.getenv("IBM_PROJECT_ID")

        token_res = requests.post(
            "https://iam.cloud.ibm.com/identity/token",
            data=f"grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={ibm_api_key}",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = token_res.json().get("access_token")

        prompt = (
            f'Write a 2-3 sentence reading passage inspired by the book "{title}" by {author}. '
            f"The passage should capture the themes and style of the book and be appropriate for grades 3-6. "
            f"Write only the passage — no title, no labels, no quotes. "
            f"Description: {description[:300]}"
        )

        wx_res = requests.post(
            f"{wx_url}/ml/v1/text/chat?version=2023-05-29",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "model_id": model_id,
                "messages": [
                    {"role": "system", "content": "You write short reading passages for elementary school students. Write only the passage text — no titles, no labels, no quotes."},
                    {"role": "user", "content": prompt},
                ],
                "project_id": project_id,
                "max_tokens": 120,
            },
        )
        passage = wx_res.json()["choices"][0]["message"]["content"].strip()
        return jsonify({"passage": passage}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
