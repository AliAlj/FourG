async function getAzureToken() {
  const res = await fetch(`https://${AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY }
  });
  return await res.text();
}

async function speakText(text) {
  document.getElementById('speakingBar').classList.add('active');
  try {
    const token = await getAzureToken();
    const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'><prosody rate='0.85' pitch='+5%'>${text}</prosody></voice></speak>`;
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
    audio.onended = () => document.getElementById('speakingBar').classList.remove('active');
    audio.play();
  } catch {
    document.getElementById('speakingBar').classList.remove('active');
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  }
}

async function speakTextSlow(word) {
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
    new Audio(URL.createObjectURL(blob)).play();
  } catch {
    const utt = new SpeechSynthesisUtterance(word);
    utt.rate = 0.4;
    window.speechSynthesis.speak(utt);
  }
}
