function toggleRecording() { if (isRecording) stopRecording(); else startRecording(); }

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
        document.getElementById('statusMsg').innerText = 'No speech detected. Please try again.';
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

      const alignedCount = countAlignedWords(
        normalizeReadingWords(passageText),
        normalizeReadingWords(fullTranscript)
      );
      const wpm = elapsedMs > 0 ? Math.round(alignedCount / (elapsedMs / 60000)) : 0;
      const target = getTargetWordsPerMinute(currentStudent.grade);
      const fluencyTip = document.getElementById('fluencyTip');
      if (fluencyTip) fluencyTip.textContent =
        `Reading speed vs. your grade ${currentStudent.grade} target. You read ~${wpm} words/min. Target: ${target} words/min.`;
      const badWords = allWords.filter(w =>
        w.PronunciationAssessment && w.PronunciationAssessment.AccuracyScore < 75
      );
      await generateFeedback(fullTranscript.trim(), acc, flu, com, overall, badWords);
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        startedAt = Date.now();
        isRecording = true;
        document.getElementById('micBtn').classList.add('recording');
        document.getElementById('micLabel').innerText = 'Listening... tap again when you finish';
        document.getElementById('transcriptBox').innerText = 'Listening...';
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
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('micLabel').innerText = 'Processing your reading...';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('loadingMsg').innerText = 'Analyzing pronunciation with Azure AI...';
  recognizer.stopContinuousRecognitionAsync(() => {}, err => console.error(err));
}


