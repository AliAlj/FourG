function toggleRecording() { if (isRecording) stopRecording(); else startRecording(); }

// ── Reading presence (live teacher dashboard) ─────────────────────────────────
let _presenceRowId = null;

async function setReadingPresence() {
  if (!currentClassCode) return;
  try {
    const title = document.getElementById('passageTitle')?.innerText || '';
    const { data } = await sb.from('reading_presence').insert({
      class_code: currentClassCode,
      student_name: currentStudent.name,
      grade: currentStudent.grade,
      book_title: title
    }).select('id').single();
    if (data) _presenceRowId = data.id;
  } catch {}
}

async function clearReadingPresence() {
  if (!_presenceRowId) return;
  try { await sb.from('reading_presence').delete().eq('id', _presenceRowId); } catch {}
  _presenceRowId = null;
}

// ── Audio capture (parallel to Azure) ────────────────────────────────────────
let mediaRecorder = null;
let recordingChunks = [];
let lastRecordingUrl = null;
let captureStream = null;

function startAudioCapture() {
  recordingChunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
    : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    captureStream = stream;
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordingChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType });
      if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
      lastRecordingUrl = URL.createObjectURL(blob);
      captureStream.getTracks().forEach(t => t.stop());
      captureStream = null;
      showPlaybackSection();
    };
    mediaRecorder.start();
  }).catch(() => {}); // fail silently — Azure scoring still works
}

function stopAudioCapture() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
}

function cleanupRecordingAudio() {
  if (lastRecordingUrl) { URL.revokeObjectURL(lastRecordingUrl); lastRecordingUrl = null; }
  const sec = document.getElementById('playbackSection');
  if (sec) sec.style.display = 'none';
}

function showPlaybackSection() {
  const sec = document.getElementById('playbackSection');
  if (!sec || !lastRecordingUrl) return;
  const audio = document.getElementById('playbackAudio');
  if (audio) audio.src = lastRecordingUrl;
  sec.style.display = 'block';
}

function playBackRecording() {
  const audio = document.getElementById('playbackAudio');
  if (!audio || !lastRecordingUrl) return;
  if (audio.paused) {
    stopAllSpeech();
    audio.play();
    document.getElementById('playbackBtn').textContent = '⏸ Pause';
  } else {
    audio.pause();
    document.getElementById('playbackBtn').textContent = '▶️ Hear yourself';
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function normalizeReadingWords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/'/g, '')
    .match(/[a-z0-9]+/g) || [];
}

function countAlignedWords(referenceWords, spokenWords) {
  const previous = new Array(spokenWords.length + 1).fill(0);
  const current = new Array(spokenWords.length + 1).fill(0);

  for (const referenceWord of referenceWords) {
    for (let i = 1; i <= spokenWords.length; i++) {
      current[i] = referenceWord === spokenWords[i - 1]
        ? previous[i - 1] + 1
        : Math.max(previous[i], current[i - 1]);
    }
    previous.splice(0, previous.length, ...current);
    current.fill(0);
  }

  return previous[spokenWords.length];
}

function getTargetWordsPerMinute(grade) {
  const targets = {
    1: 60,
    2: 90,
    3: 110,
    4: 120,
    5: 130,
    6: 140,
    7: 150,
    8: 160
  };

  return targets[grade] || 120;
}

function calculatePaceScore(alignedWordCount, elapsedMs, grade) {
  if (elapsedMs <= 0 || alignedWordCount === 0) return 0;

  const wordsPerMinute = alignedWordCount / (elapsedMs / 60000);
  const targetWordsPerMinute = getTargetWordsPerMinute(grade);
  const tooFastWordsPerMinute = targetWordsPerMinute * 1.4;

  if (wordsPerMinute <= targetWordsPerMinute) {
    return Math.round((wordsPerMinute / targetWordsPerMinute) * 100);
  }

  if (wordsPerMinute <= tooFastWordsPerMinute) {
    return 100;
  }

  const penalty = ((wordsPerMinute - tooFastWordsPerMinute) / targetWordsPerMinute) * 50;
  return Math.max(70, Math.round(100 - penalty));
}

function calculateWholePassageScores(passageText, transcript, azureAccuracy, elapsedMs, grade) {
  const referenceWords = normalizeReadingWords(passageText);
  const spokenWords = normalizeReadingWords(transcript);
  const alignedWords = countAlignedWords(referenceWords, spokenWords);
  const coverageRatio = referenceWords.length > 0
    ? Math.min(1, alignedWords / referenceWords.length)
    : 0;

  return {
    accuracy: Math.round(azureAccuracy),
    fluency: calculatePaceScore(alignedWords, elapsedMs, grade),
    completeness: Math.round(coverageRatio * 100)
  };
}

function startRecording() {
  const passageText = document.getElementById('passageText').innerText;
  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const pronConfig = new SpeechSDK.PronunciationAssessmentConfig(
      passageText,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Word,
      true
    );
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(recognizer);

    let fullTranscript = '';
    let allWords = [];
    let accSum = 0, count = 0;
    let startedAt = 0;
    wordHighlightPointer = 0;

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const pr = SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);
        fullTranscript += e.result.text + ' ';
        document.getElementById('transcriptBox').innerText = fullTranscript.trim();
        accSum += pr.accuracyScore;
        count++;
        if (pr.detailResult && pr.detailResult.Words) {
          allWords = allWords.concat(pr.detailResult.Words);
          highlightWords(pr.detailResult.Words, 'passageText');
        }
      }
    };

    recognizer.sessionStopped = async () => {
      if (count === 0) {
        await clearReadingPresence();
        document.getElementById('statusMsg').innerText = currentLanguage === 'es'
          ? 'No se detectó habla. Por favor, inténtalo de nuevo.'
          : 'No speech detected. Please try again.';
        document.getElementById('loading').style.display = 'none';
        resetReadingState();
        return;
      }
      const azureAcc = accSum / count;
      const elapsedMs = Date.now() - startedAt;
      const scores = calculateWholePassageScores(
        passageText,
        fullTranscript,
        azureAcc,
        elapsedMs,
        currentStudent.grade
      );
      const acc = scores.accuracy;
      const flu = scores.fluency;
      const com = scores.completeness;
      const overall = Math.round((acc + flu + com) / 3);

      const referenceWords = normalizeReadingWords(passageText);
      const alignedCount = countAlignedWords(referenceWords, normalizeReadingWords(fullTranscript));
      const wpm = elapsedMs > 0 ? Math.round(alignedCount / (elapsedMs / 60000)) : 0;
      const target = getTargetWordsPerMinute(currentStudent.grade);
      const fluencyTip = document.getElementById('fluencyTip');
      if (fluencyTip) fluencyTip.textContent =
        `Reading speed vs. your grade ${currentStudent.grade} target. You read ~${wpm} words/min. Target: ${target} words/min.`;
      const badWords = allWords.filter(w =>
        w.PronunciationAssessment && w.PronunciationAssessment.AccuracyScore < 75
      );
      const scoreMeta = {
        wpm,
        targetWpm: target,
        totalPassageWords: referenceWords.length,
        alignedWords: alignedCount,
        mispronounced: badWords.length,
        totalScored: allWords.length,
        elapsedSec: Math.round(elapsedMs / 1000)
      };
      await generateFeedback(fullTranscript.trim(), acc, flu, com, overall, badWords, scoreMeta);
      await clearReadingPresence();
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        startedAt = Date.now();
        isRecording = true;
        startAudioCapture();
        setReadingPresence();
        document.getElementById('micBtn').classList.add('recording');
        document.getElementById('micLabel').innerText = currentLanguage === 'es'
          ? 'Escuchando... toca de nuevo cuando termines'
          : 'Listening... tap again when you finish';
        document.getElementById('transcriptBox').innerText = currentLanguage === 'es' ? 'Escuchando...' : 'Listening...';
        document.getElementById('feedbackCard').style.display = 'none';
      },
      err => alert('Could not start: ' + err)
    );
  } catch (err) {
    alert('Azure Speech error: ' + err.message);
  }
}

function stopRecording() {
  if (!recognizer) return;
  isRecording = false;
  stopAudioCapture();
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('micLabel').innerText = 'Processing your reading...';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('loadingMsg').innerText = 'Analyzing pronunciation with Azure AI...';
  recognizer.stopContinuousRecognitionAsync(() => {}, err => console.error(err));
}

// ── Single-word pronunciation practice ───────────────────────────────────────

function practiceWord(word, resultElId, btnId) {
  const resultEl = document.getElementById(resultElId);
  const btn = document.getElementById(btnId);
  if (!resultEl || !btn) return;

  btn.disabled = true;
  btn.textContent = '👂 Listening...';
  resultEl.innerHTML = '';

  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const pronConfig = new SpeechSDK.PronunciationAssessmentConfig(
      word,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Word,
      true
    );
    const rec = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(rec);

    rec.recognizeOnceAsync(result => {
      rec.close();
      btn.disabled = false;
      btn.textContent = '🎙️ Try again';

      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const pr = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
        const score = Math.round(pr.accuracyScore);
        const color = score >= 85 ? '#2e7d32' : score >= 65 ? '#e65100' : '#c62828';
        const msg = score >= 85 ? 'Great pronunciation!' : score >= 65 ? 'Getting there!' : 'Keep practicing!';
        resultEl.innerHTML = `
          <span class="word-practice-score" style="color:${color}">${score}%</span>
          <span class="word-practice-msg">${msg}</span>`;
      } else {
        resultEl.innerHTML = `<span class="word-practice-msg" style="color:#aaa">Didn't catch that — try again</span>`;
      }
    }, () => {
      rec.close();
      btn.disabled = false;
      btn.textContent = '🎙️ Try again';
      resultEl.innerHTML = `<span class="word-practice-msg" style="color:#aaa">Could not record — try again</span>`;
    });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🎙️ Try again';
    resultEl.innerHTML = `<span class="word-practice-msg" style="color:#aaa">Microphone error</span>`;
  }
}


