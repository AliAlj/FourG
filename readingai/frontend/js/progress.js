async function goToProgress() {
  showScreen('progressScreen');
  ['progressStreak','progressStats','progressLevel','progressWordBtn','progressList'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  document.getElementById('progressStreak').innerHTML = '<div class="progress-loading">Loading your progress...</div>';
  await loadProgress();
}

async function loadProgress() {
  if (!currentStudent.userId) {
    document.getElementById('progressStreak').innerHTML = '<p style="color:#aaa">Sign in to see your progress.</p>';
    return;
  }

  const { data, error } = await sb.from('reading_sessions')
    .select('*')
    .eq('student_id', currentStudent.userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    document.getElementById('progressStreak').innerHTML = '<p style="color:#aaa">Could not load progress.</p>';
    return;
  }

  if (!data.length) {
    document.getElementById('progressStreak').innerHTML =
      '<p style="color:#aaa;text-align:center;padding:2rem 0">No readings yet — pick a book from the library to get started!</p>';
    return;
  }

  renderStreak(data);
  renderProgressStats(data);
  renderReadingLevel(data);
  renderWordPracticeButton(data);
  renderProgressList(data);
}

function calculateStreak(sessions) {
  if (!sessions.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dates = [...new Set(sessions.map(s => s.created_at.split('T')[0]))].sort().reverse();
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function renderStreak(sessions) {
  const streak = calculateStreak(sessions);
  if (streak === 0) {
    document.getElementById('progressStreak').innerHTML =
      `<div class="streak-card streak-zero">Read today to start your streak! 📖</div>`;
    return;
  }
  const message = streak >= 7 ? "You're on fire!" : streak >= 3 ? 'Keep it up!' : 'Great start!';
  document.getElementById('progressStreak').innerHTML =
    `<div class="streak-card">
      <span class="streak-flame">🔥</span>
      <span class="streak-number">${streak}</span>
      <span class="streak-label">day streak · ${message}</span>
    </div>`;
}

function renderProgressStats(sessions) {
  const avg = Math.round(sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length);
  const best = Math.max(...sessions.map(s => s.overall_score));
  const color = avg >= 90 ? '#2e7d32' : avg >= 75 ? '#1a3a5c' : avg >= 60 ? '#e65100' : '#c62828';
  document.getElementById('progressStats').innerHTML = `
    <div class="progress-stats-row">
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:${color}">${avg}%</div>
        <div class="progress-stat-label">Average Score</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:#2e7d32">${best}%</div>
        <div class="progress-stat-label">Best Score</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:#1a3a5c">${sessions.length}</div>
        <div class="progress-stat-label">Books Read</div>
      </div>
    </div>`;
}

function renderReadingLevel(sessions) {
  const grade = currentStudent.grade || 3;
  const recent = sessions.slice(0, 5);
  const avg = Math.round(recent.reduce((sum, s) => sum + s.overall_score, 0) / recent.length);
  const threshold = 85;
  const ready = avg >= threshold && recent.length >= 3;
  const pct = Math.min(100, Math.round((avg / threshold) * 100));

  document.getElementById('progressLevel').innerHTML = `
    <div class="level-card">
      <div class="level-header">
        <span class="level-title">Reading Level</span>
        <span class="level-grade">Grade ${grade}</span>
      </div>
      ${ready
        ? `<div class="level-ready">⭐ You're ready for Grade ${grade + 1} level books!</div>`
        : `<div class="level-bar-wrap">
            <div class="level-bar" style="width:${pct}%"></div>
           </div>
           <div class="level-hint">${threshold - avg > 0 ? `${threshold - avg}% more to reach Grade ${grade + 1} level` : 'Almost there!'}</div>`
      }
    </div>`;
}

function renderWordPracticeButton(sessions) {
  const words = aggregateDifficultWords(sessions);
  if (!words.length) return;
  document.getElementById('progressWordBtn').innerHTML =
    `<button class="btn-word-practice" onclick="goToWordPractice()">
      📝 Practice Words (${words.length} to work on)
    </button>`;
}

function aggregateDifficultWords(sessions) {
  const counts = {};
  sessions.forEach(s => {
    (s.difficult_words || []).forEach(word => {
      const w = word.toLowerCase();
      counts[w] = (counts[w] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));
}

function renderProgressList(sessions) {
  document.getElementById('progressList').innerHTML = `
    <h3 style="margin:1.5rem 0 0.75rem;font-size:0.95rem;color:#555">Reading History</h3>
    ${sessions.map(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const color = s.overall_score >= 90 ? '#2e7d32' : s.overall_score >= 75 ? '#1a3a5c' : s.overall_score >= 60 ? '#e65100' : '#c62828';
      const words = s.difficult_words?.length ? s.difficult_words.join(', ') : null;
      return `
        <div class="progress-session-card">
          <div class="progress-session-top">
            <div class="progress-session-title">${s.book_title}</div>
            <div class="progress-session-score" style="color:${color}">${s.overall_score}%</div>
          </div>
          <div class="progress-session-scores">
            <span>Accuracy ${s.accuracy_score}%</span>
            <span>Fluency ${s.fluency_score}%</span>
            <span>Completeness ${s.completeness_score}%</span>
          </div>
          ${words ? `<div class="progress-session-words">Words to practice: ${words}</div>` : ''}
          <div class="progress-session-date">${date}</div>
        </div>`;
    }).join('')}`;
}

async function goToWordPractice() {
  showScreen('wordPracticeScreen');
  document.getElementById('wordPracticeList').innerHTML = '<div class="progress-loading">Loading words...</div>';

  const { data } = await sb.from('reading_sessions')
    .select('difficult_words')
    .eq('student_id', currentStudent.userId);

  if (!data) return;
  const words = aggregateDifficultWords(data);

  if (!words.length) {
    document.getElementById('wordPracticeList').innerHTML = '<p style="color:#aaa">No difficult words recorded yet.</p>';
    return;
  }

  document.getElementById('wordPracticeList').innerHTML = words.map(({ word, count }) =>
    `<div class="word-practice-row">
      <div class="word-practice-info">
        <span class="word-practice-word">${word}</span>
        <span class="word-practice-count">${count}x struggled</span>
      </div>
      <button class="hear-btn" onclick="hearWordInline('${word}')">🔊 Hear it</button>
    </div>`
  ).join('');
}
