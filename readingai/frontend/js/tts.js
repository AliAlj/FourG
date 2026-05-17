// Single shared audio instance — all TTS goes through here so voices never overlap
let _activeTTSAudio = null;

// Feedback voice: Spanish when student is in Spanish mode (feedback text is in Spanish)
// Word voice: always English — student needs to hear correct English pronunciation
function feedbackVoice() { return currentLanguage === 'es' ? 'es-MX-DaliaNeural' : 'en-US-JennyNeural'; }
function feedbackLang()  { return currentLanguage === 'es' ? 'es-MX' : 'en-US'; }

function stopAllSpeech() {
  if (_activeTTSAudio) {
    _activeTTSAudio.pause();
    _activeTTSAudio.src = '';
    _activeTTSAudio = null;
  }
  const playback = document.getElementById('playbackAudio');
  if (playback && !playback.paused) {
    playback.pause();
    const btn = document.getElementById('playbackBtn');
    if (btn) btn.textContent = '▶️ Hear yourself';
  }
  window.speechSynthesis.cancel();
  document.getElementById('speakingBar')?.classList.remove('active');
}

async function getAzureToken() {
  const res = await fetch(`https://${AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY }
  });
  return await res.text();
}

// Used for AI feedback — speaks in the student's language
async function speakText(text) {
  stopAllSpeech();
  document.getElementById('speakingBar').classList.add('active');
  try {
    const token = await getAzureToken();
    const ssml = `<speak version='1.0' xml:lang='${feedbackLang()}'><voice name='${feedbackVoice()}'><prosody rate='0.85' pitch='+5%'>${text}</prosody></voice></speak>`;
    const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    _activeTTSAudio = audio;
    audio.onended = () => {
      _activeTTSAudio = null;
      document.getElementById('speakingBar').classList.remove('active');
    };
    audio.play();
  } catch {
    document.getElementById('speakingBar').classList.remove('active');
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  }
}

// Used for word pronunciation — always English so students hear correct English
async function speakWithSyllableAnimation(word, syllables) {
  stopAllSpeech();
  const bubbles = document.querySelectorAll('.syllable-bubble');
  bubbles.forEach(b => b.classList.remove('syl-active', 'syl-done'));

  const msPerSyllable = 450;
  syllables.forEach((_, i) => {
    setTimeout(() => {
      bubbles.forEach(b => b.classList.remove('syl-active'));
      if (i > 0 && bubbles[i - 1]) bubbles[i - 1].classList.add('syl-done');
      if (bubbles[i]) bubbles[i].classList.add('syl-active');
    }, i * msPerSyllable);
  });
  setTimeout(() => {
    bubbles.forEach(b => { b.classList.remove('syl-active'); b.classList.add('syl-done'); });
    setTimeout(() => bubbles.forEach(b => b.classList.remove('syl-done')), 500);
  }, syllables.length * msPerSyllable + 150);

  try {
    const token = await getAzureToken();
    const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'><prosody rate='0.5'>${word}</prosody></voice></speak>`;
    const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    _activeTTSAudio = audio;
    audio.onended = () => { _activeTTSAudio = null; };
    audio.play();
  } catch {
    const utt = new SpeechSynthesisUtterance(word);
    utt.rate = 0.4;
    window.speechSynthesis.speak(utt);
  }
}

// Used for word pronunciation — always English
async function speakTextSlow(word) {
  stopAllSpeech();
  try {
    const token = await getAzureToken();
    const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'><prosody rate='0.5'>${word}</prosody></voice></speak>`;
    const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    _activeTTSAudio = audio;
    audio.onended = () => { _activeTTSAudio = null; };
    audio.play();
  } catch {
    const utt = new SpeechSynthesisUtterance(word);
    utt.rate = 0.4;
    window.speechSynthesis.speak(utt);
  }
}
