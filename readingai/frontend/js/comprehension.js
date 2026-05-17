let comprehensionContext = null;
let comprehensionQuestions = [];
let comprehensionAnswers = [];

async function startComprehensionQuiz(passage, title, onComplete) {
  comprehensionContext = { passage, title, onComplete };
  comprehensionQuestions = [];
  comprehensionAnswers = [];

  showScreen('comprehensionScreen');
  document.getElementById('comprehensionBookTitle').innerText = title;
  document.getElementById('comprehensionLoading').style.display = 'block';
  document.getElementById('comprehensionQBody').style.display = 'none';
  document.getElementById('comprehensionResults').style.display = 'none';

  const questions = await generateComprehensionQuestions(passage);
  comprehensionQuestions = questions;

  document.getElementById('comprehensionLoading').style.display = 'none';
  renderComprehensionQuestions(questions);
  document.getElementById('comprehensionQBody').style.display = 'block';
}

async function generateComprehensionQuestions(passage, bookGrade) {
  const grade = bookGrade || currentStudent?.grade || 4;
  const levelDesc = grade <= 2
    ? 'very simple — grade 1-2, short sentences, basic who/what/where questions only'
    : grade === 3
    ? 'simple — grade 3, straightforward questions about characters and events'
    : 'grade 4-5, mix of literal and simple inferential questions';

  const system = `You are a reading comprehension question writer. Generate exactly 3 multiple-choice questions based ONLY on what the passage says. The questions should be ${levelDesc}.
Respond ONLY with valid JSON matching this exact schema (no markdown, no extra text):
{"questions":[{"question":"string","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A"}]}
Rules:
- Every question must be answerable from the passage text alone
- Use simple words a child can understand
- Each question has exactly 4 choices labeled A, B, C, D
- One and only one correct answer per question`;

  const userMsg = `Write 3 comprehension questions for this passage:\n\n"${passage.substring(0, 900)}"`;

  try {
    const res = await fetch('https://fourg-44vh.onrender.com/api/bookworm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: userMsg }], max_tokens: 700 })
    });
    const data = await res.json();
    const content = (data.reply || '').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.slice(0, 3);
    }
  } catch (err) {
    console.error('Comprehension question error:', err);
  }

  return [{
    question: 'What is this passage mainly about?',
    choices: ['A. Something unrelated', 'B. The main topic of the reading', 'C. A story about sports', 'D. A recipe'],
    answer: 'B'
  }];
}

function renderComprehensionQuestions(questions) {
  comprehensionAnswers = new Array(questions.length).fill(null);
  const body = document.getElementById('comprehensionQBody');
  body.innerHTML = questions.map((q, qi) => `
    <div class="comp-question">
      <div class="comp-q-text">${qi + 1}. ${q.question}</div>
      <div class="comp-choices">
        ${q.choices.map((choice, ci) => {
          const letter = 'ABCD'[ci];
          return `<button class="comp-choice-btn" id="compBtn${qi}_${ci}"
            onclick="selectCompAnswer(${qi}, '${letter}', this)">${choice}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('') + `
    <button class="btn-primary" id="compSubmitBtn" onclick="submitComprehension()" disabled style="margin-top:1.25rem">
      Check my answers
    </button>`;
}

function selectCompAnswer(qi, letter, btn) {
  const q = comprehensionQuestions[qi];
  q.choices.forEach((_, ci) => {
    document.getElementById(`compBtn${qi}_${ci}`)?.classList.remove('selected');
  });
  btn.classList.add('selected');
  comprehensionAnswers[qi] = letter;

  const allAnswered = comprehensionAnswers.every(a => a !== null);
  document.getElementById('compSubmitBtn').disabled = !allAnswered;
}

function submitComprehension() {
  let correct = 0;

  comprehensionQuestions.forEach((q, qi) => {
    const studentAnswer = comprehensionAnswers[qi];
    const isCorrect = studentAnswer === q.answer;
    if (isCorrect) correct++;

    q.choices.forEach((_, ci) => {
      const letter = 'ABCD'[ci];
      const btn = document.getElementById(`compBtn${qi}_${ci}`);
      if (!btn) return;
      btn.disabled = true;
      if (letter === q.answer) {
        btn.classList.add('comp-correct');
      } else if (letter === studentAnswer) {
        btn.classList.add('comp-incorrect');
      }
    });
  });

  document.getElementById('compSubmitBtn').style.display = 'none';

  const pct = Math.round((correct / comprehensionQuestions.length) * 100);
  const color = pct === 100 ? '#2e7d32' : pct >= 67 ? '#1a3a5c' : '#e65100';
  const msg = pct === 100 ? 'Perfect! You understood everything!' :
              pct >= 67  ? 'Great job! You got most of it.' :
              pct >= 33  ? 'Good try! Rereading might help.' :
                           'That was tricky — keep practicing!';

  document.getElementById('comprehensionResultScore').innerHTML =
    `<span style="color:${color}">${correct}/${comprehensionQuestions.length} correct</span>`;
  document.getElementById('comprehensionResultMsg').innerText = msg;
  document.getElementById('comprehensionResults').style.display = 'block';
  document.getElementById('comprehensionResults').scrollIntoView({ behavior: 'smooth' });

  saveComprehensionScore(pct);
}

async function saveComprehensionScore(pct) {
  if (!currentStudent?.userId) return;
  const title = comprehensionContext?.title;
  if (!title) return;

  try {
    // Find the most recent reading session for this book
    const { data } = await sb.from('reading_sessions')
      .select('id, book_title')
      .eq('student_id', currentStudent.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    const match = data.find(s =>
      s.book_title === title || s.book_title.startsWith(title + ' (Page')
    );

    if (match) {
      await sb.from('reading_sessions')
        .update({ comprehension_score: pct })
        .eq('id', match.id);
    }
  } catch (err) {
    console.error('Comprehension save error:', err);
  }
}

function comprehensionDone() {
  if (comprehensionContext?.onComplete) comprehensionContext.onComplete();
}

function startPassageComprehension() {
  const passage = document.getElementById('passageText').innerText;
  const title = document.getElementById('passageTitle').innerText;
  startComprehensionQuiz(passage, title, () => showScreen('readingScreen'));
}
