async function getIBMToken() {
  const { data, error } = await sb.functions.invoke('get-ibm-token');
  if (error) throw error;
  return data.access_token;
}

let lastScoreMeta = null;

function detectPhonicsPattern(word) {
  const w = word.toLowerCase();
  const es = currentLanguage === 'es';
  // English phonics patterns — tips in Spanish when student is a Spanish speaker learning English
  if (/tion$|sion$|cion$/.test(w))             return { pattern: es ? 'terminaciones -tion / -sion' : '-tion / -sion endings',       tip: es ? 'Estas letras juntas suenan "shun" — como en "na-shun" (nation)' : 'These endings say "shun" — like in "na-shun" (nation)' };
  if (/ght/.test(w))                             return { pattern: es ? 'palabras con -ght'            : '-ght words',                  tip: es ? 'La "gh" es silenciosa — solo pronuncia la vocal antes de ella' : 'The "gh" is silent — just say the vowel sound before it' };
  if (/ph/.test(w))                              return { pattern: es ? 'palabras con ph'              : 'ph words',                    tip: es ? '"ph" suena como "f" — como en "phone" (fon)' : '"ph" sounds like "f" — like in "phone"' };
  if (/ch|sh|th|wh/.test(w))                    return { pattern: es ? 'dígrafos (ch / sh / th / wh)' : 'digraphs (ch / sh / th / wh)', tip: es ? 'Dos letras que juntas hacen un solo sonido en inglés' : 'Two letters that work together to make one sound' };
  if (/str|spr|scr|spl|thr/.test(w))            return { pattern: es ? 'grupos de tres consonantes'   : 'triple blends (str / spr / scr)', tip: es ? 'Tres consonantes juntas — di cada sonido rápidamente' : 'Three consonants together — say each sound quickly in a row' };
  if (/[^aeiou][aeiou][^aeiou]e$/.test(w))      return { pattern: es ? 'palabras con e final silenciosa' : 'silent-e words',           tip: es ? 'La "e" al final no se pronuncia, pero hace que la vocal anterior diga su nombre — como "cake" o "bike"' : 'The e at the end is silent and makes the vowel say its name — like "cake" or "bike"' };
  if (/ai|ay|ea|ee|oa|ow|ou|oo|au|aw/.test(w)) return { pattern: es ? 'vocales combinadas'            : 'vowel teams',                 tip: es ? 'Dos vocales juntas hacen un solo sonido en inglés' : 'Two vowels work together to make one sound' };
  if (/ar|er|ir|or|ur/.test(w))                 return { pattern: es ? 'vocales con r'                 : 'r-controlled vowels',         tip: es ? 'La "r" cambia el sonido de la vocal — como "ar" en "car" o "er" en "her"' : 'The r changes the vowel sound — like "ar" in "car" or "ir" in "bird"' };
  if (/bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sl|sm|sn|sp|st|sw|tr|tw/.test(w))
                                                 return { pattern: es ? 'grupos de consonantes'        : 'consonant blends',            tip: es ? 'Dos consonantes juntas — pronuncia los dos sonidos rápidamente' : 'Two consonants together — say both sounds quickly' };
  if (/le$/.test(w) && w.length > 3)            return { pattern: es ? 'terminaciones -le'            : '-le endings',                 tip: es ? 'La terminación "-le" en inglés hace un sonido suave "ul" — como en "puzzle"' : 'The -le at the end makes a soft "ul" sound — like "puz-zle"' };
  if (/ing$/.test(w))                            return { pattern: es ? 'terminaciones -ing'           : '-ing endings',                tip: es ? 'Se agrega "-ing" al verbo — la terminación siempre suena igual' : 'Just add "ing" to the base word — the ending stays the same' };
  if (/ed$/.test(w))                             return { pattern: es ? 'terminaciones -ed'            : '-ed endings',                 tip: es ? '"-ed" puede sonar "d", "t", o "ed" dependiendo de la palabra' : '"ed" can say "d", "t", or "ed" depending on the word' };
  return null;
}

async function generateFeedback(transcript, acc, flu, com, overall, badWords, scoreMeta = {}) {
  // Sanitize — Azure can produce NaN if a recognition segment had no scoreable words
  acc     = Number.isFinite(acc)     ? acc     : 0;
  flu     = Number.isFinite(flu)     ? flu     : 0;
  com     = Number.isFinite(com)     ? com     : 0;
  overall = Number.isFinite(overall) ? overall : Math.round((acc + flu + com) / 3);
  if (overall <= 0) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('statusMsg').innerText = 'Could not score that reading — please try again.';
    return;
  }

  lastScoreMeta = scoreMeta;
  document.getElementById('loadingMsg').innerText = currentLanguage === 'es'
    ? 'IBM Granite está escribiendo tus comentarios...'
    : 'IBM Granite is writing your feedback...';
  const wordList = badWords.length > 0
    ? badWords.map(w => `${w.Word} scored ${Math.round(w.PronunciationAssessment.AccuracyScore)}%`).join(', ')
    : 'none';

  const phonicsPatterns = [...new Set(
    badWords.map(w => detectPhonicsPattern(w.Word)?.pattern).filter(Boolean)
  )];
  const phonicsLine = phonicsPatterns.length > 0
    ? `\nPhonics patterns to work on: ${phonicsPatterns.join(', ')}`
    : '';

  const langInstruction = currentLanguage === 'es'
    ? 'Respond in Spanish. Use simple vocabulary for a Spanish-speaking elementary student.'
    : '';

  let sys, instruction;
  if (overall >= 90) {
    sys = `You are a kind reading helper for elementary school students. ${langInstruction} The student did an exceptional job. Celebrate enthusiastically and be specific. Use short warm sentences. Mention their name. 2 sentences max. Do not suggest anything to improve.`;
    instruction = `Celebrate this student's excellent reading. Be specific and enthusiastic.`;
  } else if (overall >= 75) {
    sys = `You are a kind reading helper for elementary school students. ${langInstruction} Speak simply and warmly. The student did well. Acknowledge their strength, then briefly mention one word to keep practicing. 3 sentences max. Mention their name. No generic closing phrases.`;
    instruction = `Give warm feedback. Note one mispronounced word and give a simple tip.`;
  } else if (overall >= 60) {
    sys = `You are a kind reading helper for elementary school students. ${langInstruction} Speak simply and warmly. Start with genuine encouragement, then give one simple concrete tip about a mispronounced word or phonics pattern. 3 sentences max. Mention their name.`;
    instruction = `Encourage genuinely, then give one very simple tip about a mispronounced word or the phonics pattern listed.`;
  } else if (overall >= 45) {
    sys = `You are a kind reading helper for elementary school students. ${langInstruction} The student is working hard but finding reading challenging. Lead with warmth — say that reading takes practice and everyone improves. Give one very simple concrete tip. 3 sentences max. Mention their name. Be extra encouraging.`;
    instruction = `Be especially warm. Acknowledge the challenge. Give one tiny, simple tip. Make the student feel safe to keep trying.`;
  } else {
    sys = `You are a kind reading helper for elementary school students. ${langInstruction} The student is really struggling. Your most important job is to keep them from giving up. Find something positive — even just that they finished. Never reference the low score negatively. Gently suggest trying the passage again. 3 sentences max. Mention their name. Be gentle and warm.`;
    instruction = `Find something positive first. Keep them from feeling discouraged. Suggest trying the passage one more time.`;
  }

  try {
    const msg = `Student: ${currentStudent.name}, Grade ${currentStudent.grade}
Overall score: ${overall}%
Words needing work: ${wordList}${phonicsLine}
${instruction}`;

    const { data, error } = await sb.functions.invoke('ibm-chat', {
      body: {
        messages: [{ role: 'system', content: sys }, { role: 'user', content: msg }],
        max_tokens: 200,
        project_id: IBM_PROJECT_ID
      }
    });
    if (error) throw error;
    lastFeedback = data.content;
    if (!lastFeedback) throw new Error('empty response');
  } catch {
    const n = currentStudent.name;
    if (currentLanguage === 'es') {
      if (overall >= 90)      lastFeedback = `¡Lectura increíble, ${n}! Sacaste ${overall}% — ¡eso es un trabajo sobresaliente!`;
      else if (overall >= 75) lastFeedback = `¡Buen trabajo, ${n}! Sacaste ${overall}% — ¡estás progresando mucho como lector!`;
      else if (overall >= 60) lastFeedback = `¡Buen esfuerzo, ${n}! Sacaste ${overall}% — ¡sigue practicando y seguirás mejorando!`;
      else if (overall >= 45) lastFeedback = `¡Trabajaste muy duro hoy, ${n}, y eso toma valor! Cada vez que lees, mejoras un poco más.`;
      else                    lastFeedback = `${n}, lo lograste — ¡leer es difícil y no te rendiste! Intenta leer este pasaje una vez más y verás lo más fácil que se siente.`;
    } else {
      if (overall >= 90)      lastFeedback = `Amazing reading, ${n}! You scored ${overall}% — that is outstanding work!`;
      else if (overall >= 75) lastFeedback = `Great job, ${n}! You scored ${overall}% — you are making real progress as a reader!`;
      else if (overall >= 60) lastFeedback = `Good effort, ${n}! You scored ${overall}% — keep practicing and you will keep improving!`;
      else if (overall >= 45) lastFeedback = `You worked hard today, ${n}, and that takes real courage! Every time you read, you get a little better.`;
      else                    lastFeedback = `${n}, you did it — reading is hard work and you kept going! Try reading this passage one more time and notice how much easier it feels.`;
    }
  }

  await loadWordData(badWords);
  showFeedback(acc, flu, com, overall, badWords);
  await saveSession(acc, flu, com, overall, badWords);
  await speakText(lastFeedback);
}

async function loadWordData(badWords) {
  if (badWords.length === 0) return;
  for (const w of badWords) {
    const word = w.Word.toLowerCase();
    if (wordDataCache[word]) continue;
    try {
      const { data, error } = await sb.functions.invoke('ibm-chat', {
        body: {
          messages: [
            { role: 'system', content: 'Respond only in JSON. No markdown. No explanation.' },
            { role: 'user', content: `For the English word "${word}" return: {"pos": "noun/verb/adjective/adverb/etc", "definition": "${currentLanguage === 'es' ? 'una definición simple en español para un estudiante de grado 4 que está aprendiendo inglés' : 'one simple sentence definition for a grade 4 student'}", "syllables": ["array", "of", "syllables"]}` }
          ],
          project_id: IBM_PROJECT_ID,
          max_tokens: 100
        }
      });
      if (error) throw error;
      const text = data.content?.trim();
      if (!text) throw new Error('empty');
      const clean = text.replace(/```json|```/g, '').trim();
      wordDataCache[word] = JSON.parse(clean);
    } catch {
      wordDataCache[word] = { pos: 'word', definition: 'Look this word up to learn more!' };
    }
  }
}

async function showRereadHistory(title) {
  const el = document.getElementById('rereadHistory');
  if (!el || !currentStudent.userId) return;
  try {
    const { data } = await sb.from('reading_sessions')
      .select('overall_score')
      .eq('student_id', currentStudent.userId)
      .eq('book_title', title)
      .not('overall_score', 'is', null)
      .gt('overall_score', 0)
      .order('created_at', { ascending: true });
    const valid = (data || []).filter(s => Number.isFinite(s.overall_score) && s.overall_score > 0);
    if (valid.length <= 1) { el.style.display = 'none'; return; }
    const arrow = valid[valid.length - 1].overall_score > valid[0].overall_score ? '📈' : '';
    document.getElementById('rereadCount').innerText = `You've read this ${valid.length} times ${arrow}`;
    document.getElementById('rereadScores').innerText =
      'Scores: ' + valid.map(s => s.overall_score + '%').join(' → ');
    el.style.display = 'block';
  } catch { el.style.display = 'none'; }
}

function countUpScore(elId, target, delay) {
  const el = document.getElementById(elId);
  el.innerText = '0';
  const badge = el.closest('.score-badge');
  if (badge) {
    badge.style.opacity = '0';
    setTimeout(() => {
      badge.style.opacity = '1';
      badge.classList.add('animate-in');
      setTimeout(() => badge.classList.remove('animate-in'), 500);
    }, delay);
  }
  let current = 0;
  const step = Math.ceil(target / 30);
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.innerText = current;
    if (current >= target) {
      clearInterval(interval);
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 200);
    }
  }, 28);
}

function launchConfetti() {
  const colors = ['#f0a500','#e74c3c','#2e7d32','#1a3a5c','#9b59b6','#16a085','#e67e22'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: ${-10 - Math.random() * 20}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      --dy: ${400 + Math.random() * 300}px;
      --rot: ${180 + Math.random() * 360}deg;
      --dur: ${1.1 + Math.random() * 0.7}s;
      animation-delay: ${Math.random() * 0.4}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}

function showFeedback(acc, flu, com, overall, badWords) {
  document.getElementById('loading').style.display = 'none';

  countUpScore('scoreAccuracy', acc, 0);
  countUpScore('scoreFluency', flu, 120);
  countUpScore('scoreCompleteness', com, 240);
  countUpScore('scoreOverall', overall, 380);

  if (overall >= 85) setTimeout(launchConfetti, 500);

  const enc = currentLanguage === 'es'
    ? (overall >= 90 ? '¡Lectura sobresaliente!' :
       overall >= 75 ? '¡Buen trabajo!' :
       overall >= 60 ? '¡Buen esfuerzo!' :
       overall >= 45 ? '¡Sigue adelante — tú puedes!' :
       '¡Leer toma práctica — eres valiente por intentarlo!')
    : (overall >= 90 ? 'Outstanding reading!' :
       overall >= 75 ? 'Great job!' :
       overall >= 60 ? 'Good effort!' :
       overall >= 45 ? 'Keep going — you can do this!' :
       'Reading takes practice — you are brave for trying!');
  document.getElementById('encouragementText').innerText = enc;
  document.getElementById('aiFeedbackBox').innerText = lastFeedback;

  renderScoreBreakdown(acc, flu, com, overall);
  renderPhonicsGroups(badWords);

  const title = document.getElementById('passageTitle').innerText;
  showRereadHistory(title);

  if (badWords.length > 0) {
    document.getElementById('wordCardsSection').style.display = 'block';
    document.getElementById('wordCards').innerHTML = badWords.map(w => {
      const word = w.Word.toLowerCase();
      const score = Math.round(w.PronunciationAssessment.AccuracyScore);
      const cls = score < 50 ? 'bad' : 'ok';
      const wd = wordDataCache[word] || {};
      const def = wd.definition || 'Tap again to open';
      const pos = wd.pos || '';
      return `
        <div class="word-card ${cls}" onclick="flipWordCard(this, '${w.Word}', ${score})">
          <div class="word-card-inner">
            <div class="word-card-front">
              <div class="word-text">${w.Word}</div>
              ${pos ? `<div class="word-pos">${pos}</div>` : ''}
              <div class="word-score ${cls}">${score}% accuracy</div>
              <button class="hear-btn" onclick="event.stopPropagation();hearWordInline('${w.Word}')">🔊 Hear it</button>
            </div>
            <div class="word-card-back">
              <div class="back-word">${w.Word}</div>
              <div class="back-def">${def}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  } else {
    document.getElementById('wordCardsSection').style.display = 'none';
  }

  document.getElementById('feedbackCard').style.display = 'block';
  document.getElementById('feedbackCard').scrollIntoView({ behavior: 'smooth' });
}

function flipWordCard(card, word, score) {
  if (card.classList.contains('flipped')) {
    card.classList.remove('flipped');
  } else {
    card.classList.add('flipped');
    setTimeout(() => openWordModal(word, score), 250);
  }
}

async function openWordModal(word, score) {
  stopAllSpeech();
  currentModalWord = word;
  const wd = wordDataCache[word.toLowerCase()] || {};
  const syllables = Array.isArray(wd.syllables) && wd.syllables.length > 0 ? wd.syllables : [word];
  document.getElementById('modalWord').innerHTML = syllables
    .map((s, i) => `<span class="syllable-bubble" id="syl-${i}">${s}</span>`)
    .join('<span class="syllable-dot">·</span>');
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

async function hearWord() {
  if (!currentModalWord) return;
  const wd = wordDataCache[currentModalWord.toLowerCase()] || {};
  const syllables = Array.isArray(wd.syllables) && wd.syllables.length > 0 ? wd.syllables : [currentModalWord];
  await speakWithSyllableAnimation(currentModalWord, syllables);
}
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

function renderPhonicsGroups(badWords) {
  const section = document.getElementById('phonicsSection');
  const container = document.getElementById('phonicsGroups');
  if (!section || !container || badWords.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  const groups = {};
  for (const w of badWords) {
    const result = detectPhonicsPattern(w.Word);
    if (result) {
      if (!groups[result.pattern]) groups[result.pattern] = { tip: result.tip, words: [] };
      groups[result.pattern].words.push(w.Word);
    }
  }

  const entries = Object.entries(groups);
  if (entries.length === 0) { section.style.display = 'none'; return; }

  container.innerHTML = entries.map(([pattern, { tip, words }]) => `
    <div class="phonics-group">
      <div class="phonics-pattern-name">🔤 ${pattern}</div>
      <div class="phonics-words">${words.join(', ')}</div>
      <div class="phonics-tip">💡 ${tip}</div>
    </div>
  `).join('');

  section.style.display = 'block';
}

function renderScoreBreakdown(acc, flu, com, overall) {
  const el = document.getElementById('scoreBreakdown');
  if (!el) return;
  const m = lastScoreMeta || {};

  const grade = currentStudent?.grade || 4;
  const wpm = m.wpm ?? '—';
  const targetWpm = m.targetWpm ?? getTargetWordsPerMinute(grade);
  const totalWords = m.totalPassageWords ?? '—';
  const aligned = m.alignedWords ?? '—';
  const mispronounced = m.mispronounced ?? '—';
  const totalScored = m.totalScored ?? '—';
  const secs = m.elapsedSec ?? '—';
  const correct = typeof totalScored === 'number' && typeof mispronounced === 'number'
    ? totalScored - mispronounced : '—';

  const accWhy = acc >= 90
    ? `You pronounced almost every word correctly — only ${mispronounced} word${mispronounced === 1 ? '' : 's'} out of ${totalScored} scored below 75%.`
    : acc >= 75
    ? `You got ${correct} out of ${totalScored} words right. ${mispronounced} word${mispronounced === 1 ? '' : 's'} scored below 75% and showed up as word cards below.`
    : `${mispronounced} out of ${totalScored} words scored below 75% accuracy. Tap the word cards below to practice each one.`;

  const fluWhy = wpm === '—'
    ? `Fluency measures your reading speed compared to the Grade ${grade} target of ${targetWpm} words per minute.`
    : wpm >= targetWpm && wpm <= targetWpm * 1.4
    ? `You read at ${wpm} words per minute — right in the Grade ${grade} target range of ${targetWpm} wpm. Great pace!`
    : wpm < targetWpm
    ? `You read at ${wpm} words per minute. The Grade ${grade} target is ${targetWpm} wpm. Reading a little faster will improve this score.`
    : `You read at ${wpm} words per minute — faster than the Grade ${grade} target of ${targetWpm} wpm. Slowing down slightly helps with clarity.`;

  const comWhy = typeof aligned === 'number' && typeof totalWords === 'number'
    ? `You read ${aligned} out of ${totalWords} words in the passage${secs !== '—' ? ` in ${secs} seconds` : ''}. Completeness rewards reading the full passage aloud.`
    : `Completeness measures how many passage words you read out loud compared to the full passage.`;

  const overallWhy = `Overall = (${acc} Accuracy + ${flu} Fluency + ${com} Completeness) ÷ 3 = ${overall}%.`;

  el.innerHTML = `
    <button class="score-breakdown-toggle" onclick="toggleBreakdown()">📊 Why did I get these scores? <span id="breakdownChevron">▼</span></button>
    <div id="breakdownPanel" class="score-breakdown-panel" style="display:none">
      <div class="breakdown-row">
        <div class="breakdown-icon accuracy-icon">🎯</div>
        <div>
          <div class="breakdown-label">Accuracy — ${acc}%</div>
          <div class="breakdown-text">${accWhy}</div>
        </div>
      </div>
      <div class="breakdown-row">
        <div class="breakdown-icon fluency-icon">⚡</div>
        <div>
          <div class="breakdown-label">Fluency — ${flu}%</div>
          <div class="breakdown-text">${fluWhy}</div>
        </div>
      </div>
      <div class="breakdown-row">
        <div class="breakdown-icon completeness-icon">📖</div>
        <div>
          <div class="breakdown-label">Completeness — ${com}%</div>
          <div class="breakdown-text">${comWhy}</div>
        </div>
      </div>
      <div class="breakdown-row overall-row">
        <div class="breakdown-icon overall-icon">⭐</div>
        <div>
          <div class="breakdown-label">Overall — ${overall}%</div>
          <div class="breakdown-text">${overallWhy}</div>
        </div>
      </div>
    </div>`;
}

function toggleBreakdown() {
  const panel = document.getElementById('breakdownPanel');
  const chevron = document.getElementById('breakdownChevron');
  const open = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  chevron.textContent = open ? '▲' : '▼';
}
