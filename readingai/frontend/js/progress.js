async function goToProgress() {
  showScreen('progressScreen');
  ['progressStreak','progressStats','progressLevel','progressWordBtn','progressList'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
  document.getElementById('progressStats').innerHTML =
    '<div class="dots" style="text-align:center;padding:1rem"><span></span><span></span><span></span></div>';
  await loadProgress();
}

async function loadProgress() {
  if (!currentStudent?.userId) {
    document.getElementById('progressStats').innerHTML = '<p style="color:#aaa;text-align:center;padding:1rem">Sign in to track your progress over time.</p>';
    return;
  }

  const { data, error } = await sb.from('reading_sessions')
    .select('*')
    .eq('student_id', currentStudent.userId)
    .not('overall_score', 'is', null)
    .gt('overall_score', 0)
    .order('created_at', { ascending: false });

  if (error || !data) {
    document.getElementById('progressStats').innerHTML = '<p style="color:#aaa">Could not load progress.</p>';
    return;
  }

  const valid = data;

  if (!valid.length) {
    document.getElementById('progressStats').innerHTML = `
      <div style="text-align:center;padding:2rem;color:#aaa">
        <div style="font-size:3rem;margin-bottom:0.75rem">📚</div>
        <p style="margin-bottom:1.25rem">No readings yet — pick a book from the library to get started!</p>
        <button class="btn-primary" onclick="goToLibrary()">Go to Library</button>
      </div>`;
    return;
  }

  renderStreak(data);
  renderProgressStats(valid);
  renderProgressChart(valid);
  renderReadingLevel(valid);
  renderWordPracticeButton(data);
  renderProgressList(valid);
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
  if (streak < 2) {
    document.getElementById('progressStreak').innerHTML =
      `<div class="streak-card streak-zero">Read today to start your streak! 📖</div>`;
    return;
  }
  const flames = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥';
  const message = streak >= 7 ? "You're on fire!" : streak >= 3 ? 'Keep it up!' : 'Great start!';
  document.getElementById('progressStreak').innerHTML =
    `<div class="streak-card">
      <span class="streak-flame">${flames}</span>
      <span class="streak-number">${streak}</span>
      <span class="streak-label">day streak · ${message}</span>
    </div>`;
}

function renderProgressStats(valid) {
  const avg = Math.round(valid.reduce((sum, s) => sum + s.overall_score, 0) / valid.length);
  const best = Math.max(...valid.map(s => s.overall_score));
  const uniqueBooks = new Set(valid.map(s => s.book_title.replace(/ \(Page \d+\)$/, ''))).size;
  const compSessions = valid.filter(s => s.comprehension_score != null);
  const compAvg = compSessions.length
    ? Math.round(compSessions.reduce((s, x) => s + x.comprehension_score, 0) / compSessions.length)
    : null;

  const scoreColor = sc => sc >= 90 ? '#2e7d32' : sc >= 75 ? '#1a3a5c' : sc >= 60 ? '#e65100' : '#c62828';

  document.getElementById('progressStats').innerHTML = `
    <div class="progress-stats-row">
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:#1a3a5c">${uniqueBooks}</div>
        <div class="progress-stat-label">Books Read</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:${scoreColor(avg)}">${avg}%</div>
        <div class="progress-stat-label">Avg Score</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:${scoreColor(best)}">${best}%</div>
        <div class="progress-stat-label">Best Score</div>
      </div>
      ${compAvg !== null ? `
      <div class="progress-stat">
        <div class="progress-stat-value" style="color:#6a1a8c">${compAvg}%</div>
        <div class="progress-stat-label">Comprehension</div>
      </div>` : ''}
    </div>`;
}

let _progressChartInstance = null;

function renderProgressChart(valid) {
  const wrap = document.getElementById('progressChartWrap');
  const canvas = document.getElementById('progressChart');
  if (!wrap || !canvas || valid.length < 2) return;

  const recent = valid.slice(0, 10).reverse(); // oldest → newest left to right
  const labels = recent.map(s =>
    new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  if (_progressChartInstance) { _progressChartInstance.destroy(); _progressChartInstance = null; }
  wrap.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(240,165,0,0.25)');
  grad.addColorStop(1, 'rgba(240,165,0,0)');

  // Target line at 85 as a flat dataset
  const targetData = recent.map(() => 85);

  _progressChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Overall',
          data: recent.map(s => s.overall_score),
          borderColor: '#f0a500',
          backgroundColor: grad,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#f0a500',
          fill: true,
          tension: 0.35,
          order: 1
        },
        {
          label: 'Accuracy',
          data: recent.map(s => s.accuracy_score ?? null),
          borderColor: '#1a3a5c',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 3,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          order: 2
        },
        {
          label: 'Fluency',
          data: recent.map(s => s.fluency_score ?? null),
          borderColor: '#2e7d32',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 3,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          order: 2
        },
        {
          label: 'Target (85%)',
          data: targetData,
          borderColor: 'rgba(46,125,50,0.35)',
          borderWidth: 1,
          borderDash: [6, 5],
          pointRadius: 0,
          backgroundColor: 'transparent',
          fill: false,
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, padding: 10, boxWidth: 12 }
        },
        tooltip: {
          callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y}%` }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: v => v + '%', font: { size: 11 }, stepSize: 20 },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderReadingLevel(valid) {
  const grade = currentStudent.grade || 3;
  const recent = valid.slice(0, 5);
  if (!recent.length) return;
  const avg = Math.round(recent.reduce((sum, s) => sum + s.overall_score, 0) / recent.length);
  const threshold = 85;
  const ready = avg >= threshold && recent.length >= 3;
  const pct = Math.min(100, Math.round((avg / threshold) * 100));

  const levelHtml = `
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

  document.getElementById('progressLevel').insertAdjacentHTML('beforeend', levelHtml);
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

function renderProgressList(valid) {
  const scoreColor = sc => sc >= 90 ? '#2e7d32' : sc >= 75 ? '#1a3a5c' : sc >= 60 ? '#e65100' : '#c62828';
  document.getElementById('progressList').innerHTML = `
    <h3 style="margin:1.5rem 0 0.75rem;font-size:0.95rem;color:#555">Reading History</h3>
    ${valid.slice(0, 20).map(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const color = scoreColor(s.overall_score);
      const words = (s.difficult_words || []).map(w => typeof w === 'string' ? w : w?.word).filter(Boolean).slice(0, 5);
      const wordStr = words.join(', ');
      const compBadge = s.comprehension_score != null
        ? `<span style="font-size:0.7rem;font-weight:700;color:#6a1a8c;background:#f3e8ff;padding:0.1rem 0.45rem;border-radius:99px">📝 ${s.comprehension_score}%</span>`
        : '';
      return `
        <div class="progress-session-card">
          <div class="progress-session-top">
            <div class="progress-session-title">${s.book_title}</div>
            <div style="display:flex;align-items:center;gap:0.4rem">
              ${compBadge}
              <div class="progress-session-score" style="color:${color}">${s.overall_score}%</div>
            </div>
          </div>
          <div class="progress-session-scores">
            <span>Accuracy ${s.accuracy_score ?? '—'}%</span>
            <span>Fluency ${s.fluency_score ?? '—'}%</span>
            <span>Completeness ${s.completeness_score ?? '—'}%</span>
          </div>
          ${wordStr ? `<div class="progress-session-words">Hard words: ${wordStr}</div>` : ''}
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

  document.getElementById('wordPracticeList').innerHTML = words.map(({ word, count }, i) => {
    const resultId = `wpResult_${i}`;
    const btnId = `wpBtn_${i}`;
    return `
      <div class="word-practice-row">
        <div class="word-practice-info">
          <div class="word-practice-word">${word}</div>
          <div class="word-practice-count">Struggled ${count} time${count > 1 ? 's' : ''}</div>
          <div class="word-practice-result-row" id="${resultId}"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.4rem;flex-shrink:0">
          <button class="hear-btn" onclick="speakTextSlow('${word}')">🔊 Hear it</button>
          <button class="word-try-btn" id="${btnId}" onclick="practiceWord('${word}','${resultId}','${btnId}')">🎙️ Try it</button>
        </div>
      </div>`;
  }).join('');
}
