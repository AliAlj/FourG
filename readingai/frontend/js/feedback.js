async function getIBMToken() {
  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_API_KEY}`
  });
  const data = await res.json();
  return data.access_token;
}

async function generateFeedback(transcript, acc, flu, com, overall, badWords) {
  document.getElementById('loadingMsg').innerText = 'IBM Granite is writing your feedback...';
  const wordList = badWords.length > 0
    ? badWords.map(w => `${w.Word} scored ${Math.round(w.PronunciationAssessment.AccuracyScore)}%`).join(', ')
    : 'none';

  try {
    const token = await getIBMToken();
    const sys = `You are a kind reading helper for elementary school students.
Speak simply and warmly. Use short sentences a child can understand.
Always encourage the student and mention their name.
Keep response to 3 sentences maximum.
If there are mispronounced words mention one and give a simple tip to say it better.
Do not add generic closing phrases.`;

    const msg = `Student: ${currentStudent.name}, Grade ${currentStudent.grade}
Overall score: ${overall}%
Words needing work: ${wordList}
Write simple warm feedback for this student. Mention 1 mispronounced word if any and give a simple tip.`;

    const res = await fetch(`${WX_URL}/ml/v1/text/chat?version=2023-05-29`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: MODEL_ID,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: msg }],
        project_id: IBM_PROJECT_ID,
        max_tokens: 200
      })
    });
    const data = await res.json();
    lastFeedback = data.choices[0].message.content;
  } catch {
    lastFeedback = `Great effort ${currentStudent.name}! You scored ${overall}% overall. You are improving every time you read!`;
  }

  await loadWordData(badWords);
  showFeedback(acc, flu, com, overall, badWords);
  await saveSession(acc, flu, com, overall, badWords);
  await speakText(lastFeedback);
}

async function loadWordData(badWords) {
  if (badWords.length === 0) return;
  try {
    const token = await getIBMToken();
    for (const w of badWords) {
      const word = w.Word.toLowerCase();
      if (wordDataCache[word]) continue;
      try {
        const res = await fetch(`${WX_URL}/ml/v1/text/chat?version=2023-05-29`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: MODEL_ID,
            messages: [
              { role: 'system', content: 'Respond only in JSON. No markdown. No explanation.' },
              { role: 'user', content: `For the word "${word}" return: {"pos": "noun/verb/adjective/adverb/etc", "definition": "one simple sentence definition for a grade 4 student"}` }
            ],
            project_id: IBM_PROJECT_ID,
            max_tokens: 80
          })
        });
        const data = await res.json();
        const text = data.choices[0].message.content.trim();
        const clean = text.replace(/```json|```/g, '').trim();
        wordDataCache[word] = JSON.parse(clean);
      } catch {
        wordDataCache[word] = { pos: 'word', definition: 'Look this word up to learn more!' };
      }
    }
  } catch { }
}

async function showRereadHistory(title) {
  const el = document.getElementById('rereadHistory');
  if (!el || !currentStudent.userId) return;
  try {
    const { data } = await sb.from('reading_sessions')
      .select('overall_score')
      .eq('student_id', currentStudent.userId)
      .eq('book_title', title)
      .order('created_at', { ascending: true });
    const valid = (data || []).filter(s => s.overall_score != null && !isNaN(s.overall_score));
    if (valid.length <= 1) { el.style.display = 'none'; return; }
    const arrow = valid[valid.length - 1].overall_score > valid[0].overall_score ? '📈' : '';
    document.getElementById('rereadCount').innerText = `You've read this ${valid.length} times ${arrow}`;
    document.getElementById('rereadScores').innerText =
      'Scores: ' + valid.map(s => s.overall_score + '%').join(' → ');
    el.style.display = 'block';
  } catch { el.style.display = 'none'; }
}

function showFeedback(acc, flu, com, overall, badWords) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('scoreAccuracy').innerText = acc;
  document.getElementById('scoreFluency').innerText = flu;
  document.getElementById('scoreCompleteness').innerText = com;
  document.getElementById('scoreOverall').innerText = overall;

  const enc = overall >= 90 ? 'Outstanding reading!' :
              overall >= 75 ? 'Great job!' :
              overall >= 60 ? 'Good effort!' : 'Keep practicing!';
  document.getElementById('encouragementText').innerText = enc;
  document.getElementById('aiFeedbackBox').innerText = lastFeedback;

  const title = document.getElementById('passageTitle').innerText;
  showRereadHistory(title);

  if (badWords.length > 0) {
    document.getElementById('wordCardsSection').style.display = 'block';
    document.getElementById('wordCards').innerHTML = badWords.map(w => {
      const word = w.Word.toLowerCase();
      const score = Math.round(w.PronunciationAssessment.AccuracyScore);
      const cls = score < 50 ? 'bad' : 'ok';
      const wd = wordDataCache[word] || {};
      const def = wd.definition || '';
      const pos = wd.pos || '';
      return `
        <div class="word-card ${cls}" onclick="openWordModal('${w.Word}', ${score})">
          <div class="word-text">${w.Word}</div>
          ${pos ? `<div class="word-pos">${pos}</div>` : ''}
          <div class="word-score ${cls}">${score}% accuracy</div>
          ${def ? `<div class="word-def">${def}</div>` : ''}
          <button class="hear-btn" onclick="event.stopPropagation();hearWordInline('${w.Word}')">🔊 Hear it</button>
        </div>`;
    }).join('');
  } else {
    document.getElementById('wordCardsSection').style.display = 'none';
  }

  document.getElementById('feedbackCard').style.display = 'block';
  document.getElementById('feedbackCard').scrollIntoView({ behavior: 'smooth' });
}

async function openWordModal(word, score) {
  currentModalWord = word;
  const wd = wordDataCache[word.toLowerCase()] || {};
  document.getElementById('modalWord').innerText = word;
  document.getElementById('modalPos').innerText = wd.pos || '';
  document.getElementById('modalPhonetic').innerText = phonetics[word.toLowerCase()] || 'Say it slowly, one part at a time';
  const scoreEl = document.getElementById('modalScore');
  scoreEl.innerText = `${score}% accuracy`;
  scoreEl.style.background = score < 50 ? '#fde8e8' : '#fff3cd';
  scoreEl.style.color = score < 50 ? '#c0392b' : '#856404';
  document.getElementById('modalDefinition').innerText = wd.definition || 'Loading...';
  document.getElementById('modalPracticeResult').innerHTML = '';
  document.getElementById('modalTryBtn').textContent = '🎙️ Try saying it';
  document.getElementById('modalTryBtn').disabled = false;
  document.getElementById('wordModal').classList.add('open');
}

function closeWordModal() { document.getElementById('wordModal').classList.remove('open'); }

async function hearWord() { if (currentModalWord) await speakTextSlow(currentModalWord); }
async function hearWordInline(word) { await speakTextSlow(word); }
async function speakFeedback() { if (lastFeedback) await speakText(lastFeedback); }

async function saveSession(acc, flu, com, overall, badWords) {
  if (overall == null || isNaN(overall)) return;
  const title = document.getElementById('passageTitle').innerText;
  const difficultWordNames = badWords.map(w => w.Word);

  if (currentClassCode) {
    try {
      await sb.from('student_sessions').insert({
        class_code: currentClassCode,
        student_name: currentStudent.name,
        grade: currentStudent.grade,
        city: '',
        passage_title: title,
        accuracy: acc,
        fluency: flu,
        completeness: com,
        overall,
        difficult_words: badWords.map(w => ({
          word: w.Word,
          score: Math.round(w.PronunciationAssessment.AccuracyScore),
          pos: wordDataCache[w.Word.toLowerCase()]?.pos || '',
          definition: wordDataCache[w.Word.toLowerCase()]?.definition || ''
        })),
        feedback: lastFeedback
      });
    } catch (err) {
      console.error('Session save error:', err);
    }
  }

  if (currentStudent.userId) {
    try {
      await sb.from('reading_sessions').insert({
        student_id: currentStudent.userId,
        book_title: title,
        accuracy_score: acc,
        fluency_score: flu,
        completeness_score: com,
        overall_score: overall,
        difficult_words: difficultWordNames
      });
    } catch (err) {
      console.error('Reading session save error:', err);
    }
  }
}
