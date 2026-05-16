from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from google.cloud import texttospeech
from dotenv import load_dotenv
import io
import os


load_dotenv()

app = Flask(__name__)
CORS(app)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "service-account-key.json",
)

tts_client = texttospeech.TextToSpeechClient()


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


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
