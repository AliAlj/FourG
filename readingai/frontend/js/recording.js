function toggleRecording() { if (isRecording) stopRecording(); else startRecording(); }

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
    let accSum = 0, fluSum = 0, comSum = 0, count = 0;
    wordHighlightPointer = 0;

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const pr = SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);
        fullTranscript += e.result.text + ' ';
        document.getElementById('transcriptBox').innerText = fullTranscript.trim();
        accSum += pr.accuracyScore;
        fluSum += pr.fluencyScore;
        comSum += pr.completenessScore;
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
      const acc = Math.round(accSum / count);
      const flu = Math.round(fluSum / count);
      const com = Math.round(comSum / count);
      const overall = Math.round((acc + flu + com) / 3);
      const badWords = allWords.filter(w =>
        w.PronunciationAssessment && w.PronunciationAssessment.AccuracyScore < 75
      );
      await generateFeedback(fullTranscript.trim(), acc, flu, com, overall, badWords);
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
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
