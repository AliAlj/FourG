let bookwormHistory = [];
let bookwormContext = null;
let bookwormRecognizer = null;
let bookwormListening = false;
let bookwormMemory = '';
let bookwormChallengeWords = [];
let bookwormConfidenceAsked = false;
let bookwormConfidenceLevel = null;
let bookwormRecurringWords = [];

function openBookworm(context) {
  const resumingSameBook = bookwormContext?.title === context.title && bookwormHistory.length > 0;

  bookwormContext = context;
  bookwormMemory = '';
  bookwormChallengeWords = (context.difficultWords || []).filter(Boolean);
  bookwormConfidenceAsked = false;
  bookwormConfidenceLevel = null;
  bookwormRecurringWords = [];
  document.getElementById('bookwormPanel').classList.add('open');

  if (resumingSameBook) {
    // Student pre-chatted about this book, then finished reading — continue the conversation
    if (context.score !== null) {
      const bridge = `You just finished reading it and scored ${context.score}%! Now that you've read it, what did you think — did it match what you expected?`;
      addBookwormBubble(bridge, 'worm');
      bookwormHistory.push({ role: 'assistant', content: bridge });
      bookwormSpeak(bridge);
    }
  } else {
    bookwormHistory = [];
    document.getElementById('bookwormMessages').innerHTML = '';

    const greeting = context.score !== null
      ? `Hi ${context.studentName}! Great job reading "${context.title}" — you scored ${context.score}%! Can you tell me in your own words what that passage was about?`
      : `Hi ${context.studentName}! I heard you picked "${context.title}" — awesome choice! Before you read it, what do you think it might be about?`;

    addBookwormBubble(greeting, 'worm');
    bookwormHistory.push({ role: 'assistant', content: greeting });
    bookwormSpeak(greeting);
  }

  loadBookwormMemory();
}

function openBookwormAfterReading() {
  const title = document.getElementById('passageTitle').innerText;
  const passage = document.getElementById('passageText').innerText;
  const score = parseInt(document.getElementById('scoreOverall').innerText) || null;
  const difficultWords = Array.from(document.querySelectorAll('.word-text')).map(el => el.innerText);
  openBookworm({ title, passage, score, difficultWords, studentName: currentStudent.name, grade: currentStudent.grade });
}

function openBookwormFromLibrary(idx) {
  const book = libraryBooks[idx];
  if (!book) return;
  openBookworm({ title: book.title, passage: book.text, score: null, difficultWords: [], studentName: currentStudent.name, grade: currentStudent.grade });
}

function openBookwormHelp() {
  bookwormContext = { title: null, passage: null, score: null, difficultWords: [], studentName: currentStudent?.name || 'there', grade: currentStudent?.grade || '' };
  bookwormHistory = [];
  bookwormChallengeWords = [];
  bookwormConfidenceAsked = false;
  bookwormConfidenceLevel = null;
  bookwormRecurringWords = [];
  document.getElementById('bookwormMessages').innerHTML = '';
  document.getElementById('bookwormPanel').classList.add('open');
  const greeting = "Hi! I'm BookWorm, your reading helper. How can I help you today?";
  addBookwormBubble(greeting, 'worm');
  bookwormHistory.push({ role: 'assistant', content: greeting });
  bookwormSpeak(greeting);
  loadBookwormMemory();
}

function closeBookworm() {
  document.getElementById('bookwormPanel').classList.remove('open');
  stopBookwormListening();
  stopAllSpeech();
  saveBookwormSession();
}

function addBookwormBubble(text, role) {
  const el = document.createElement('div');
  el.className = `bookworm-bubble ${role}`;
  el.innerText = text;
  const messages = document.getElementById('bookwormMessages');
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

async function bookwormSend() {
  const input = document.getElementById('bookwormInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await handleStudentMessage(text);
}

async function handleStudentMessage(text) {
  addBookwormBubble(text, 'student');
  bookwormHistory.push({ role: 'user', content: text });

  const typingEl = addBookwormBubble('Bookworm is thinking...', 'typing');
  typingEl.id = 'bookwormTyping';

  let reply;
  try {
    reply = await callGroq();
  } catch {
    reply = `That's a great thought! What else is on your mind?`;
  } finally {
    document.getElementById('bookwormTyping')?.remove();
  }

  addBookwormBubble(reply, 'worm');
  bookwormHistory.push({ role: 'assistant', content: reply });
  bookwormSpeak(reply);

  // Show confidence check-in after the student's first reply in a post-reading session
  const studentTurns = bookwormHistory.filter(m => m.role === 'user').length;
  if (!bookwormConfidenceAsked && bookwormContext?.score !== null && studentTurns === 1) {
    setTimeout(showConfidenceButtons, 600);
  }
}

function showStruggleWordDrill(words) {
  const messages = document.getElementById('bookwormMessages');
  if (!messages) return;
  const word = words[0]; // start with the most-repeated word
  const el = document.createElement('div');
  el.className = 'bookworm-bubble worm';
  el.innerHTML = `I noticed you've had trouble with <strong>"${word}"</strong> a few times. Want to practice it right now?
    <div class="confidence-btns" style="margin-top:0.5rem">
      <button onclick="startWordDrill('${word}')">✅ Yes, let's do it!</button>
      <button onclick="this.closest('.bookworm-bubble').remove()">Maybe later</button>
    </div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  bookwormSpeak(`I noticed you've had trouble with "${word}" a few times. Want to practice it right now?`);
}

function startWordDrill(word) {
  // Remove the offer bubble
  document.querySelectorAll('.bookworm-bubble.worm').forEach(el => {
    if (el.innerHTML.includes(word) && el.querySelector('.confidence-btns')) el.remove();
  });
  const prompt = `Let's practice! Can you use the word "${word}" in a sentence?`;
  addBookwormBubble(prompt, 'worm');
  bookwormHistory.push({ role: 'assistant', content: prompt });
  bookwormSpeak(prompt);
}

function showConfidenceButtons() {
  bookwormConfidenceAsked = true;
  const messages = document.getElementById('bookwormMessages');
  const el = document.createElement('div');
  el.className = 'bookworm-bubble worm';
  el.id = 'confidenceBubble';
  el.innerHTML = `How did reading feel today?
    <div class="confidence-btns">
      <button onclick="handleConfidenceChoice('easy')">😊 Easy</button>
      <button onclick="handleConfidenceChoice('medium')">😐 Medium</button>
      <button onclick="handleConfidenceChoice('hard')">😓 Hard</button>
    </div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

function handleConfidenceChoice(level) {
  bookwormConfidenceLevel = level;
  document.getElementById('confidenceBubble')?.remove();
  const label = level === 'easy' ? '😊 Easy' : level === 'medium' ? '😐 Medium' : '😓 Hard';
  addBookwormBubble(label, 'student');
  bookwormHistory.push({ role: 'user', content: `Reading felt ${level} today.` });

  const replies = {
    easy: `That's awesome — feeling confident means you're growing as a reader! 📚 What part of the passage did you like best?`,
    medium: `Medium is totally fine — that means you're being challenged in just the right way! What was the trickiest part?`,
    hard: `Thank you for being honest — hard readings are how we get stronger! What made it feel difficult?`
  };
  const reply = replies[level];
  addBookwormBubble(reply, 'worm');
  bookwormHistory.push({ role: 'assistant', content: reply });
  bookwormSpeak(reply);
}

async function callGroq() {
  const difficultList = bookwormContext.difficultWords?.length > 0
    ? bookwormContext.difficultWords.join(', ')
    : 'none';

  const memoryBlock = bookwormMemory
    ? `\n${bookwormMemory}\nUse this history naturally — reference past books when relevant, notice patterns, make the student feel known. Don't recite the history mechanically.`
    : '';

  const scoreInfo = bookwormContext.score !== null
    ? `Reading fluency score from this session: ${bookwormContext.score}% (this is a pronunciation and fluency score from the AI speech tool, not a school grade — you have full access to it and should use it)`
    : 'Reading score: not yet available (student has not read aloud yet)';

  const challengeBlock = bookwormChallengeWords.length > 0
    ? `\nVOCABULARY CHALLENGE: After 2 comprehension exchanges, shift into vocab practice. Pick one of these mispronounced words (${bookwormChallengeWords.slice(0, 3).join(', ')}) and say: "Let's practice a tricky word! Can you use '____' in a sentence?" After they try, praise the effort and give a one-sentence tip. Then try another word. Keep it playful — like a game, not a quiz. After 2-3 words return to comprehension.`
    : '';

  const recurringBlock = bookwormRecurringWords.length > 0
    ? `\nRECURRING STRUGGLE WORDS — this student has mispronounced these across multiple sessions: ${bookwormRecurringWords.join(', ')}. Bring one up early and naturally: "Hey, last time you had trouble with '____' — want to try it again today?"`
    : '';

  const system = `You are Bookworm, a warm and encouraging reading tutor for elementary school students.${currentLanguage === 'es' ? ' Respond only in Spanish. Use simple, friendly Spanish for an elementary student.' : ''}
Student name: ${bookwormContext.studentName}, Grade ${bookwormContext.grade}
Book/passage they read: "${bookwormContext.title}"
Opening of the passage: "${(bookwormContext.passage || '').substring(0, 250)}"
${scoreInfo}
Words they struggled to pronounce today: ${difficultList}${memoryBlock}${challengeBlock}${recurringBlock}

Your rules:
- Keep every reply to 2-3 short sentences max — kids lose focus quickly
- Use simple, friendly, grade-appropriate language
- Ask only one question at a time
- Focus on comprehension: what happened, why, how it connects to their life
- Reference the student's score naturally when relevant (e.g. "You scored 84% — your fluency is really improving!")
- If they ask about a word's meaning, explain it simply with an example
- If they mention a word they found hard to say, give a one-sentence tip (e.g. "Say it in parts: com-mu-ni-ty")
- Be enthusiastic and positive — never say anything discouraging
- Use their name occasionally to keep it personal
- Sound like a fun friend who loves books, not a teacher giving a test
- Never say you cannot see or access the student's score — you always have it`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: system },
          ...bookwormHistory
        ],
        max_tokens: 120,
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content
      || `That's a great thought, ${bookwormContext.studentName}! What was your favorite part of the passage?`;
  } catch (err) {
    console.error('Groq error:', err);
    return `That's a great thought, ${bookwormContext.studentName}! What was your favorite part of the passage?`;
  }
}

// ── Cross-session memory ──────────────────────────────────────────────────────

async function loadBookwormMemory() {
  bookwormMemory = '';
  if (!currentStudent?.userId) return;

  try {
    const [{ data: sessions }, { data: readings }] = await Promise.all([
      sb.from('bookworm_sessions')
        .select('book_title, reading_score, summary, created_at')
        .eq('student_id', currentStudent.userId)
        .order('created_at', { ascending: false })
        .limit(5),
      sb.from('reading_sessions')
        .select('book_title, overall_score, difficult_words, created_at')
        .eq('student_id', currentStudent.userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const parts = [];

    if (readings && readings.length > 0) {
      // Count word frequency across sessions to find recurring struggles
      const wordCount = {};
      readings.forEach(r => {
        (r.difficult_words || []).forEach(w => {
          const word = (typeof w === 'string' ? w : w?.word || '').toLowerCase().trim();
          if (word) wordCount[word] = (wordCount[word] || 0) + 1;
        });
      });
      bookwormRecurringWords = Object.entries(wordCount)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);

      if (bookwormRecurringWords.length > 0) {
        showStruggleWordDrill(bookwormRecurringWords);
      }

      const readingLines = readings.filter(r => r.overall_score != null && !isNaN(r.overall_score)).map(r => {
        const daysAgo = Math.round((Date.now() - new Date(r.created_at)) / 86400000);
        const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
        const hardWords = r.difficult_words?.length > 0 ? `; struggled with: ${r.difficult_words.slice(0, 3).join(', ')}` : '';
        return `- ${when}: Read "${r.book_title}" — scored ${r.overall_score}%${hardWords}`;
      });
      parts.push(`Student's recent reading assignments:\n${readingLines.join('\n')}`);
    }

    if (sessions && sessions.length > 0) {
      const sessionLines = sessions.map(s => {
        const daysAgo = Math.round((Date.now() - new Date(s.created_at)) / 86400000);
        const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
        return `- ${when}: Chatted about "${s.book_title}". ${s.summary}`;
      });
      parts.push(`Past Bookworm conversations:\n${sessionLines.join('\n')}`);
    }

    if (parts.length > 0) {
      bookwormMemory = parts.join('\n\n') + '\n\nUse this history naturally — notice improvement trends, reference past books, call out words they keep struggling with. Make the student feel known.';
    }
  } catch (err) {
    console.error('Memory load error:', err);
  }
}

async function saveBookwormSession() {
  // Need at least: greeting + 1 student message + 1 Bookworm reply
  if (!currentStudent?.userId || bookwormHistory.length < 3) return;

  const summary = await generateSessionSummary();
  if (!summary) return;

  try {
    await sb.from('bookworm_sessions').insert({
      student_id: currentStudent.userId,
      book_title: bookwormContext?.title || 'Unknown',
      reading_score: bookwormContext?.score ?? null,
      confidence_level: bookwormConfidenceLevel,
      summary
    });
  } catch (err) {
    console.error('Memory save error:', err);
  }
}

async function generateSessionSummary() {
  const studentTurns = bookwormHistory.filter(m => m.role === 'user');
  if (studentTurns.length === 0) return null;

  const convo = bookwormHistory
    .slice(1) // skip the opening greeting
    .map(m => `${m.role === 'user' ? currentStudent.name : 'Bookworm'}: ${m.content}`)
    .join('\n');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Summarize this reading tutor conversation in 1-2 sentences. Focus on: what the student understood, any words they found hard, and any personal connections they made. Write in third person about the student. Be specific and concrete.'
          },
          { role: 'user', content: convo }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('Summary generation error:', err);
    return null;
  }
}

// ── TTS & mic ─────────────────────────────────────────────────────────────────

async function bookwormSpeak(text) {
  stopAllSpeech();
  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 }
        })
      }
    );
    const data = await res.json();
    if (data.audioContent) {
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      _activeTTSAudio = audio;
      audio.onended = () => { _activeTTSAudio = null; };
      audio.play();
      return;
    }
  } catch { }
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

function toggleBookwormMic() {
  if (bookwormListening) stopBookwormListening();
  else startBookwormListening();
}

function startBookwormListening() {
  try {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    bookwormRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    bookwormListening = true;
    document.getElementById('bookwormMicBtn').classList.add('listening');
    document.getElementById('bookwormInput').placeholder = 'Listening...';

    bookwormRecognizer.recognizeOnceAsync(result => {
      bookwormListening = false;
      document.getElementById('bookwormMicBtn').classList.remove('listening');
      document.getElementById('bookwormInput').placeholder = 'Type or tap 🎙️ to speak...';
      if (result.text) handleStudentMessage(result.text);
      bookwormRecognizer.close();
      bookwormRecognizer = null;
    });
  } catch {
    stopBookwormListening();
  }
}

function stopBookwormListening() {
  if (bookwormRecognizer) {
    bookwormRecognizer.close();
    bookwormRecognizer = null;
  }
  bookwormListening = false;
  const btn = document.getElementById('bookwormMicBtn');
  const input = document.getElementById('bookwormInput');
  if (btn) btn.classList.remove('listening');
  if (input) input.placeholder = 'Type or tap 🎙️ to speak...';
}
