let readerBook = null;
let readerPageIndex = 0;
let readerPageScores = [];
let readerRecognizer = null;
let readerIsRecording = false;
let wordHighlightPointer = 0;

function renderTextAsWordSpans(text, elementId) {
  wordHighlightPointer = 0;
  const words = text.split(/\s+/);
  document.getElementById(elementId).innerHTML = words
    .map((word, i) => `<span class="passage-word" data-idx="${i}">${word}</span>`)
    .join(' ');
}

function highlightWords(recognizedWords, containerId) {
  if (!recognizedWords) return;
  const spans = document.querySelectorAll(`#${containerId} .passage-word`);
  const WINDOW = 6;

  for (const rw of recognizedWords) {
    const clean = rw.Word.toLowerCase().replace(/[^a-z']/g, '');
    if (!clean) continue;
    const score = rw.PronunciationAssessment?.AccuracyScore ?? 0;
    const colorClass = score >= 80 ? 'word-good' : score >= 60 ? 'word-ok' : 'word-bad';

    let matched = false;
    const limit = Math.min(wordHighlightPointer + WINDOW, spans.length);
    for (let i = wordHighlightPointer; i < limit; i++) {
      const spanClean = spans[i].innerText.toLowerCase().replace(/[^a-z']/g, '');
      if (spanClean === clean) {
        // mark any skipped words red (student skipped them)
        for (let j = wordHighlightPointer; j < i; j++) {
          spans[j].className = 'passage-word word-bad';
        }
        spans[i].className = 'passage-word ' + colorClass;
        wordHighlightPointer = i + 1;
        matched = true;
        break;
      }
    }

    // word not found nearby — mark current position red and advance
    if (!matched && wordHighlightPointer < spans.length) {
      spans[wordHighlightPointer].className = 'passage-word word-bad';
      wordHighlightPointer++;
    }
  }
}

function openBookReader(book) {
  readerBook = book;
  readerPageIndex = 0;
  readerPageScores = [];
  showScreen('bookReaderScreen');
  showReaderPage();
}

function showReaderPage() {
  const page = readerBook.pages[readerPageIndex];
  const total = readerBook.pages.length;

  document.getElementById('readerTitle').innerText = readerBook.title;
  document.getElementById('readerPageLabel').innerText = `Page ${readerPageIndex + 1} of ${total}`;
  document.getElementById('readerProgressBar').style.width = `${((readerPageIndex) / total) * 100}%`;
  document.getElementById('readerImage').src = page.image;
  document.getElementById('readerImage').alt = `${readerBook.title} illustration`;
  renderTextAsWordSpans(page.text, 'readerText');
  document.getElementById('readerTranscript').style.display = 'none';
  document.getElementById('readerTranscript').innerText = '';
  document.getElementById('readerFeedback').style.display = 'none';
  document.getElementById('readerMicLabel').innerText = 'Tap the mic and read the page out loud';
  document.getElementById('readerMicBtn').classList.remove('recording');
  readerIsRecording = false;
}

function toggleReaderRecording() {
  if (readerIsRecording) stopReaderRecording();
  else startReaderRecording();
}

function startReaderRecording() {
  const page = readerBook.pages[readerPageIndex];
  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const pronConfig = new SpeechSDK.PronunciationAssessmentConfig(
      page.text,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Word,
      true
    );
    readerRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(readerRecognizer);

    let transcript = '';
    let accSum = 0, fluSum = 0, comSum = 0, count = 0;
    let allWords = [];

    readerRecognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const pr = SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);
        transcript += e.result.text + ' ';
        document.getElementById('readerTranscript').innerText = transcript.trim();
        accSum += pr.accuracyScore;
        fluSum += pr.fluencyScore;
        comSum += pr.completenessScore;
        count++;
        if (pr.detailResult?.Words) {
          allWords = allWords.concat(pr.detailResult.Words);
          highlightWords(pr.detailResult.Words, 'readerText');
        }
      }
    };

    readerRecognizer.sessionStopped = async () => {
      readerIsRecording = false;
      document.getElementById('readerMicBtn').classList.remove('recording');
      document.getElementById('readerMicLabel').innerText = 'Great reading!';

      if (count === 0) {
        document.getElementById('readerMicLabel').innerText = 'No speech detected. Try again!';
        return;
      }

      const acc = Math.round(accSum / count);
      const flu = Math.round(fluSum / count);
      const com = Math.round(comSum / count);
      const overall = Math.round((acc + flu + com) / 3);
      readerPageScores.push(overall);

      const isLast = readerPageIndex === readerBook.pages.length - 1;
      const color = overall >= 90 ? '#2e7d32' : overall >= 75 ? '#1a3a5c' : overall >= 60 ? '#e65100' : '#c62828';

      document.getElementById('readerScoreRow').innerHTML = `
        <div class="reader-score-chip" style="background:#f0f7ff">
          <div style="font-size:1.3rem;font-weight:800;color:${color}">${overall}%</div>
          <div style="font-size:0.7rem;color:#888">Overall</div>
        </div>
        <div class="reader-score-chip">
          <div style="font-size:1rem;font-weight:700;color:#1a3a5c">${acc}%</div>
          <div style="font-size:0.7rem;color:#888">Accuracy</div>
        </div>
        <div class="reader-score-chip">
          <div style="font-size:1rem;font-weight:700;color:#1a3a5c">${flu}%</div>
          <div style="font-size:0.7rem;color:#888">Fluency</div>
        </div>`;

      document.getElementById('readerNextBtn').innerText = isLast ? 'Finish Book 🎉' : 'Next Page →';
      document.getElementById('readerFeedback').style.display = 'block';

      const badWords = allWords.filter(w => w.PronunciationAssessment?.AccuracyScore < 75);
      await saveReaderPageSession(overall, acc, flu, com, badWords);
    };

    readerRecognizer.startContinuousRecognitionAsync(() => {
      readerIsRecording = true;
      document.getElementById('readerMicBtn').classList.add('recording');
      document.getElementById('readerMicLabel').innerText = 'Listening... tap again when done';
      document.getElementById('readerTranscript').style.display = 'block';
      document.getElementById('readerTranscript').innerText = 'Listening...';
    }, err => alert('Could not start: ' + err));

  } catch (err) {
    alert('Azure Speech error: ' + err.message);
  }
}

function stopReaderRecording() {
  if (!readerRecognizer) return;
  document.getElementById('readerMicLabel').innerText = 'Processing...';
  readerRecognizer.stopContinuousRecognitionAsync(() => {}, err => console.error(err));
}

function readerNextPage() {
  const isLast = readerPageIndex === readerBook.pages.length - 1;
  if (isLast) {
    finishBook();
  } else {
    readerPageIndex++;
    showReaderPage();
    window.scrollTo(0, 0);
  }
}

function finishBook() {
  const avg = readerPageScores.length > 0
    ? Math.round(readerPageScores.reduce((s, x) => s + x, 0) / readerPageScores.length)
    : 0;
  const color = avg >= 90 ? '#2e7d32' : avg >= 75 ? '#1a3a5c' : avg >= 60 ? '#e65100' : '#c62828';
  const message = avg >= 90 ? 'Outstanding reading!' : avg >= 75 ? 'Great job!' : avg >= 60 ? 'Good effort!' : 'Keep practicing!';

  document.getElementById('finishTitle').innerText = readerBook.title;
  document.getElementById('finishScores').innerHTML = `
    <div class="reader-score-chip" style="background:#f0f7ff">
      <div style="font-size:2rem;font-weight:800;color:${color}">${avg}%</div>
      <div style="font-size:0.75rem;color:#888">Average Score</div>
    </div>
    <div class="reader-score-chip">
      <div style="font-size:1.5rem;font-weight:800;color:#1a3a5c">${readerBook.pages.length}</div>
      <div style="font-size:0.75rem;color:#888">Pages Read</div>
    </div>`;
  document.getElementById('finishMessage').innerText = message;

  // Set up bookworm context for post-book chat
  document.getElementById('passageTitle').innerText = readerBook.title;
  document.getElementById('passageText').innerText = readerBook.pages.map(p => p.text).join(' ');
  document.getElementById('scoreOverall').innerText = avg;

  const fullText = readerBook.pages.map(p => p.text).join(' ');
  startComprehensionQuiz(fullText, readerBook.title, () => showScreen('bookFinishScreen'), readerBook.grade);
}

async function saveReaderPageSession(overall, acc, flu, com, badWords) {
  if (!currentStudent.userId) return;
  if (overall == null || isNaN(overall)) return;
  try {
    await sb.from('reading_sessions').insert({
      student_id: currentStudent.userId,
      book_title: `${readerBook.title} (Page ${readerPageIndex + 1})`,
      accuracy_score: acc,
      fluency_score: flu,
      completeness_score: com,
      overall_score: overall,
      difficult_words: badWords.map(w => w.Word)
    });
  } catch (err) {
    console.error('Reader session save error:', err);
  }
}

function exitBookReader() {
  stopReadAlong();
  if (readerRecognizer) {
    readerRecognizer.close();
    readerRecognizer = null;
  }
  readerIsRecording = false;
  goToLibrary();
}

// ── Read-Along (Listen First) ──────────────────────────────────────────────

let readAlongActive = false;

function toggleReadAlong(textId, btnId, micBtnId) {
  if (readAlongActive) {
    stopReadAlong();
    resetListenBtn(btnId);
    return;
  }

  const container = document.getElementById(textId);
  const text = container.innerText.trim();
  if (!text) return;

  renderTextAsWordSpans(text, textId);
  const spans = Array.from(document.querySelectorAll(`#${textId} .passage-word`));
  let wordIndex = 0;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.lang = 'en-US';

  utterance.addEventListener('boundary', e => {
    if (e.name !== 'word') return;
    if (wordIndex > 0) spans[wordIndex - 1]?.classList.remove('word-current');
    spans[wordIndex]?.classList.add('word-current');
    wordIndex++;
  });

  utterance.onend = () => {
    spans.forEach(s => s.classList.remove('word-current'));
    readAlongActive = false;
    resetListenBtn(btnId);
    document.getElementById(micBtnId)?.focus();
  };

  utterance.onerror = () => {
    readAlongActive = false;
    resetListenBtn(btnId);
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  readAlongActive = true;

  const btn = document.getElementById(btnId);
  if (btn) { btn.textContent = '⏹ Stop listening'; btn.style.background = '#fde8e8'; btn.style.borderColor = '#e74c3c'; btn.style.color = '#c0392b'; }
}

function stopReadAlong() {
  window.speechSynthesis.cancel();
  readAlongActive = false;
  ['listenAlongBtn', 'readerListenBtn'].forEach(id => resetListenBtn(id));
  document.querySelectorAll('.word-current').forEach(s => s.classList.remove('word-current'));
}

function resetListenBtn(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = '🔊 Listen first';
  btn.style.background = '';
  btn.style.borderColor = '';
  btn.style.color = '';
}

// ── Tap a word to hear it ─────────────────────────────────────────────────

document.addEventListener('click', e => {
  const span = e.target.closest('#passageText .word-bad, #passageText .word-ok, #readerText .word-bad, #readerText .word-ok');
  if (!span) return;
  const word = span.innerText.replace(/[^a-zA-Z']/g, '').trim();
  if (word) speakTextSlow(word);
});
