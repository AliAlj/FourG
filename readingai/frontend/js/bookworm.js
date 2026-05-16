let bookwormHistory = [];
let bookwormContext = null;
let bookwormRecognizer = null;
let bookwormListening = false;

function openBookworm(context) {
  bookwormContext = context;
  bookwormHistory = [];
  document.getElementById('bookwormMessages').innerHTML = '';
  document.getElementById('bookwormPanel').classList.add('open');

  const greeting = context.score !== null
    ? `Hi ${context.studentName}! Great job reading "${context.title}" — you scored ${context.score}%! Can you tell me in your own words what that passage was about?`
    : `Hi ${context.studentName}! I heard you picked "${context.title}" — awesome choice! Before you read it, what do you think it might be about?`;

  addBookwormBubble(greeting, 'worm');
  bookwormHistory.push({ role: 'assistant', content: greeting });
  bookwormSpeak(greeting);
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

function closeBookworm() {
  document.getElementById('bookwormPanel').classList.remove('open');
  stopBookwormListening();
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

  const reply = await callGroq();
  document.getElementById('bookwormTyping')?.remove();

  addBookwormBubble(reply, 'worm');
  bookwormHistory.push({ role: 'assistant', content: reply });
  bookwormSpeak(reply);
}

async function callGroq() {
  const difficultList = bookwormContext.difficultWords?.length > 0
    ? bookwormContext.difficultWords.join(', ')
    : 'none';

  const system = `You are Bookworm, a warm and encouraging reading tutor for elementary school students.
Student name: ${bookwormContext.studentName}, Grade ${bookwormContext.grade}
Book/passage they read: "${bookwormContext.title}"
Opening of the passage: "${(bookwormContext.passage || '').substring(0, 250)}"
${bookwormContext.score !== null ? `Their reading score: ${bookwormContext.score}%` : ''}
Words they struggled to pronounce: ${difficultList}

Your rules:
- Keep every reply to 2-3 short sentences max — kids lose focus quickly
- Use simple, friendly, grade-appropriate language
- Ask only one question at a time
- Focus on comprehension: what happened, why, how it connects to their life
- If they ask about a word's meaning, explain it simply with an example
- If they mention a word they found hard to say, give a one-sentence tip (e.g. "Say it in parts: com-mu-ni-ty")
- Be enthusiastic and positive — never say anything discouraging
- Use their name occasionally to keep it personal
- Sound like a fun friend who loves books, not a teacher giving a test`;

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

async function bookwormSpeak(text) {
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
      new Audio(`data:audio/mp3;base64,${data.audioContent}`).play();
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
