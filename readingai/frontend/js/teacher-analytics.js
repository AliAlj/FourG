async function loadClassAnalytics(classCode) {
  document.getElementById('analyticsOverview').innerHTML =
    '<div style="color:#aaa;font-size:0.85rem;padding:0.5rem 0">Loading student data...</div>';
  document.getElementById('analyticsWords').innerHTML = '';

  const { data: profiles } = await sb.from('student_profiles')
    .select('*').eq('class_code', classCode);

  if (!profiles?.length) {
    document.getElementById('analyticsOverview').innerHTML =
      '<p style="color:#aaa;font-size:0.85rem;padding:0.5rem 0">No students have joined this class yet.</p>';
    return;
  }

  const studentIds = profiles.map(p => p.user_id);
  const [{ data: sessions }, { data: bwSessions }] = await Promise.all([
    sb.from('reading_sessions').select('*').in('student_id', studentIds).order('created_at', { ascending: false }),
    sb.from('bookworm_sessions').select('student_id, confidence_level, created_at').in('student_id', studentIds).order('created_at', { ascending: false })
  ]);

  const allReadingSessions = (sessions || []).filter(s => s.overall_score != null && !isNaN(s.overall_score));
  const byStudent = {};
  allReadingSessions.forEach(s => {
    if (!byStudent[s.student_id]) byStudent[s.student_id] = [];
    byStudent[s.student_id].push(s);
  });

  // Most recent confidence level per student
  const confidenceByStudent = {};
  (bwSessions || []).forEach(s => {
    if (s.confidence_level && !confidenceByStudent[s.student_id]) {
      confidenceByStudent[s.student_id] = s.confidence_level;
    }
  });

  window._analyticsProfiles = profiles;
  window._analyticsByStudent = byStudent;

  renderStudentOverviewCards(profiles, byStudent, confidenceByStudent);
  renderClassWordsHeatmap(allReadingSessions);
  startLiveSection(classCode);
}

// ── Live reading dashboard ────────────────────────────────────────────────────
let _liveReaders = new Map();
let _liveChannel = null;

async function startLiveSection(classCode) {
  // Fetch any currently active readers
  try {
    const { data } = await sb.from('reading_presence').select('*').eq('class_code', classCode);
    _liveReaders = new Map((data || []).map(r => [r.id, r]));
  } catch {}
  renderLiveSection();

  // Clean up any previous subscription
  if (_liveChannel) { sb.removeChannel(_liveChannel); _liveChannel = null; }

  _liveChannel = sb.channel(`live-${classCode}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reading_presence',
      filter: `class_code=eq.${classCode}`
    }, payload => {
      if (payload.eventType === 'INSERT') {
        _liveReaders.set(payload.new.id, payload.new);
      } else if (payload.eventType === 'DELETE') {
        _liveReaders.delete(payload.old.id);
      }
      renderLiveSection();
    })
    .subscribe();
}

function renderLiveSection() {
  const el = document.getElementById('liveSection');
  if (!el) return;
  const readers = [..._liveReaders.values()];
  if (readers.length === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="live-section">
      <div class="live-header">
        <span class="pulse-dot"></span>
        <span class="live-title">Reading right now</span>
        <span class="live-count">${readers.length} student${readers.length > 1 ? 's' : ''}</span>
      </div>
      <div class="live-readers">
        ${readers.map(r => `
          <div class="live-reader-chip">
            <span class="live-reader-name">${r.student_name}</span>
            <span class="live-reader-book">${r.book_title || 'reading...'}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function analyticsScoreColor(score) {
  return score >= 90 ? '#2e7d32' : score >= 75 ? '#1a3a5c' : score >= 60 ? '#e65100' : '#c62828';
}

function analyticsTrend(sessions) {
  if (sessions.length < 4) return '→';
  const recent = sessions.slice(0, 3).reduce((s, x) => s + x.overall_score, 0) / 3;
  const older = sessions.slice(3, 6);
  const olderAvg = older.reduce((s, x) => s + x.overall_score, 0) / (older.length || 1);
  if (recent - olderAvg > 5) return '↑';
  if (olderAvg - recent > 5) return '↓';
  return '→';
}

function computeAtRisk(profiles, byStudent) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const atRisk = [];

  profiles.forEach(p => {
    const sessions = byStudent[p.user_id] || [];
    const reasons = [];

    if (sessions.length >= 2 &&
        sessions[0].overall_score < 60 &&
        sessions[1].overall_score < 60) {
      reasons.push(`scored below 60% twice in a row (${sessions[1].overall_score}% → ${sessions[0].overall_score}%)`);
    }

    const lastDate = sessions[0] ? new Date(sessions[0].created_at) : null;
    if (!lastDate || lastDate < sevenDaysAgo) {
      const daysAgo = lastDate ? Math.round((Date.now() - lastDate) / 86400000) : null;
      reasons.push(daysAgo ? `hasn't read in ${daysAgo} days` : `hasn't read yet`);
    }

    if (reasons.length > 0) atRisk.push({ name: p.name, grade: p.grade, reasons });
  });

  return atRisk;
}

function renderAtRiskBanner(atRisk) {
  if (atRisk.length === 0) return '';

  const rows = atRisk.map(s => `
    <div class="at-risk-row">
      <div class="at-risk-name">
        ${s.name}
        <span class="at-risk-grade">Grade ${s.grade}</span>
      </div>
      <div class="at-risk-reasons">${s.reasons.join(' &nbsp;·&nbsp; ')}</div>
    </div>`).join('');

  return `
    <div class="at-risk-card">
      <div class="at-risk-header">
        <span style="font-size:1.4rem;line-height:1">⚠️</span>
        <div>
          <div style="font-weight:800;font-size:0.95rem;color:#c62828">
            Needs Attention &nbsp;
            <span style="background:#c62828;color:white;border-radius:99px;padding:0.1rem 0.55rem;font-size:0.75rem">${atRisk.length}</span>
          </div>
          <div style="font-size:0.75rem;color:#888;margin-top:0.15rem">Students who may need extra support this week</div>
        </div>
      </div>
      <div class="at-risk-list">${rows}</div>
    </div>`;
}

function renderStudentOverviewCards(profiles, byStudent, confidenceByStudent = {}) {
  window._studentProfiles = {};
  profiles.forEach(p => { window._studentProfiles[p.user_id] = p; });

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const atRisk = computeAtRisk(profiles, byStudent);

  const confidenceEmoji = { easy: '😊', medium: '😐', hard: '😓' };
  const confidenceLabel = { easy: 'Felt easy', medium: 'Felt medium', hard: 'Felt hard' };

  const cards = profiles.map(p => {
    const sessions = byStudent[p.user_id] || [];
    const avg = sessions.length
      ? Math.round(sessions.reduce((s, x) => s + x.overall_score, 0) / sessions.length)
      : null;
    const trend = analyticsTrend(sessions);
    const lastDate = sessions[0] ? new Date(sessions[0].created_at) : null;
    const inactive = !lastDate || lastDate < weekAgo;
    const trendColor = trend === '↑' ? '#2e7d32' : trend === '↓' ? '#c62828' : '#888';

    const compSessions = sessions.filter(s => s.comprehension_score != null);
    const compAvg = compSessions.length
      ? Math.round(compSessions.reduce((s, x) => s + x.comprehension_score, 0) / compSessions.length)
      : null;
    const compColor = compAvg === null ? '#bbb' : compAvg >= 80 ? '#2e7d32' : compAvg >= 60 ? '#e65100' : '#c62828';

    const confidence = confidenceByStudent[p.user_id];
    const confBadge = confidence
      ? `<span title="${confidenceLabel[confidence]}" style="font-size:0.75rem;cursor:default">${confidenceEmoji[confidence]}</span>`
      : '';

    // Flag students scoring high but feeling hard — hidden struggle
    const hiddenStruggle = confidence === 'hard' && avg !== null && avg >= 75;

    return `<div class="soc ${inactive ? 'soc-inactive' : ''}${hiddenStruggle ? ' soc-hidden-struggle' : ''}">
      <div class="soc-top">
        <div>
          <div class="soc-name">${p.name} ${confBadge}</div>
          <div class="soc-grade">Grade ${p.grade}${p.email ? ` · <span style="font-weight:400;color:#999">${p.email}</span>` : ''}</div>
        </div>
        <div style="text-align:right">
          <div class="soc-score" style="color:${avg !== null ? analyticsScoreColor(avg) : '#bbb'}">${avg !== null ? avg + '%' : '—'}</div>
          <div class="soc-trend" style="color:${trendColor}">${trend}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.35rem">
        <div class="soc-footer ${inactive ? 'soc-warn' : ''}" style="margin-top:0">
          ${hiddenStruggle
            ? '⚠️ Scoring well but feels hard — check in'
            : inactive
              ? "⚠️ Hasn't read this week"
              : lastDate
                ? 'Last read ' + lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'No readings yet'}
        </div>
        ${compAvg !== null
          ? `<div style="font-size:0.68rem;font-weight:700;color:${compColor};white-space:nowrap">📝 ${compAvg}%</div>`
          : ''}
      </div>
      <button class="soc-notes-btn" onclick="event.stopPropagation();openStudentNotes('${p.user_id}')">📋 Notes</button>
    </div>`;
  }).join('');

  document.getElementById('analyticsOverview').innerHTML = `
    ${renderAtRiskBanner(atRisk)}
    <div class="analytics-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <h3 class="analytics-heading" style="margin-bottom:0">Student Overview</h3>
        <button class="btn-weekly-summary" id="weeklySummaryBtn" onclick="generateWeeklySummaries()">📧 Weekly Summaries</button>
      </div>
      <div class="soc-grid">${cards}</div>
    </div>
    <div id="weeklySummariesOutput"></div>`;
}

function renderClassWordsHeatmap(sessions) {
  const wordStudents = {};
  sessions.forEach(s => {
    (s.difficult_words || []).forEach(word => {
      const w = word.toLowerCase();
      if (!wordStudents[w]) wordStudents[w] = new Set();
      wordStudents[w].add(s.student_id);
    });
  });

  const sorted = Object.entries(wordStudents)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 20);

  if (!sorted.length) {
    document.getElementById('analyticsWords').innerHTML = '';
    return;
  }

  window._heatmapWords = sorted.slice(0, 8).map(([word, students]) => ({ word, count: students.size }));

  document.getElementById('analyticsWords').innerHTML = `
    <div class="analytics-section">
      <h3 class="analytics-heading">Words the Class Struggles With</h3>
      <p style="font-size:0.78rem;color:#888;margin-bottom:0.75rem">Sorted by number of students — plan a lesson around the top words.</p>
      <div class="word-heatmap">
        ${sorted.map(([word, students]) => {
          const count = students.size;
          const intensity = count >= 5 ? 'heat-high' : count >= 3 ? 'heat-mid' : 'heat-low';
          return `<div class="word-heat-chip ${intensity}">
            ${word}
            <span class="word-heat-count">${count} student${count > 1 ? 's' : ''}</span>
          </div>`;
        }).join('')}
      </div>
      <button class="btn-lesson-plan" id="lessonPlanBtn" onclick="generateLessonPlan()">
        ✏️ Generate 10-min Lesson Plan
      </button>
      <div id="lessonPlanOutput"></div>
    </div>`;
}

async function generateLessonPlan() {
  const words = window._heatmapWords;
  if (!words?.length) return;

  const btn = document.getElementById('lessonPlanBtn');
  const output = document.getElementById('lessonPlanOutput');
  btn.disabled = true;
  btn.textContent = 'IBM Granite is writing your lesson...';
  output.innerHTML = '';

  const wordList = words
    .map(w => `${w.word} (${w.count} student${w.count > 1 ? 's' : ''} struggled)`)
    .join(', ');

  const sys = `You are an experienced elementary school literacy coach writing practical lesson plans for teachers.
Write clearly and concisely. Every section must be immediately usable in a classroom.
Use this exact structure — no markdown, no bullet symbols, just plain text with the labels shown:

HOOK (1 min):
[one engaging opening activity or question]

WORD: [word]
Definition: [one simple sentence a child can understand]
Say it: [syllable breakdown, e.g. com-mu-ni-ty]
Example: [a natural sentence using the word]
Tip: [one concrete teaching tip]

[repeat WORD block for each word]

ACTIVITY (2-3 min):
[one hands-on closing activity using the words]`;

  const msg = `Write a 10-minute vocabulary lesson for an elementary class that struggled with these words: ${wordList}.
Include a hook, a WORD block for each of the top 4-5 words, and a closing activity.`;

  try {
    const { data, error } = await sb.functions.invoke('ibm-chat', {
      body: {
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: msg }
        ],
        project_id: IBM_PROJECT_ID,
        max_tokens: 800
      }
    });
    if (error) throw error;
    const text = data.content?.trim();
    if (!text) throw new Error('empty response');
    renderLessonPlan(text);
  } catch {
    output.innerHTML = `<p style="color:#c62828;font-size:0.85rem;margin-top:0.75rem">Could not generate lesson plan — try again.</p>`;
  }

  btn.disabled = false;
  btn.textContent = '✏️ Regenerate Lesson Plan';
}

function renderLessonPlan(text) {
  const output = document.getElementById('lessonPlanOutput');

  const lines = text.split('\n').filter(l => l.trim());
  let html = '<div class="lesson-plan-card">';
  html += '<div class="lesson-plan-header"><span style="font-size:1.3rem">📋</span><div><div class="lesson-plan-title">10-Minute Vocabulary Lesson</div><div class="lesson-plan-sub">Generated by IBM Granite · Ready to teach</div></div><button onclick="copyLessonPlan()" class="lesson-copy-btn">Copy</button></div>';
  html += '<div class="lesson-plan-body">';

  let inWordBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('HOOK')) {
      inWordBlock = false;
      html += `<div class="lesson-section-label hook-label">🎯 ${trimmed}</div>`;
    } else if (trimmed.startsWith('WORD:')) {
      inWordBlock = true;
      html += `<div class="lesson-word-block"><div class="lesson-word-name">${trimmed.replace('WORD:', '').trim()}</div>`;
    } else if (trimmed.startsWith('ACTIVITY')) {
      if (inWordBlock) { html += '</div>'; inWordBlock = false; }
      html += `<div class="lesson-section-label activity-label">🎮 ${trimmed}</div>`;
    } else if (trimmed.startsWith('Definition:') || trimmed.startsWith('Say it:') || trimmed.startsWith('Example:') || trimmed.startsWith('Tip:')) {
      const colon = trimmed.indexOf(':');
      const label = trimmed.substring(0, colon);
      const value = trimmed.substring(colon + 1).trim();
      html += `<div class="lesson-word-line"><span class="lesson-word-label">${label}:</span> ${value}</div>`;
    } else if (trimmed) {
      html += `<div class="lesson-plain-line">${trimmed}</div>`;
    }
  }
  if (inWordBlock) html += '</div>';

  html += '</div></div>';
  output.innerHTML = html;
  window._lessonPlanText = text;
}

function copyLessonPlan() {
  if (!window._lessonPlanText) return;
  navigator.clipboard.writeText(window._lessonPlanText);
  const btn = document.querySelector('.lesson-copy-btn');
  if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
}

// Assignments
async function loadAssignmentsAdmin() {
  const el = document.getElementById('assignmentsAdmin');
  if (!el || !teacherClasses.length) return;

  const { data: { user } } = await sb.auth.getUser();
  const classCodes = teacherClasses.map(c => c.class_code);

  const [{ data: assignments }, { data: profiles }] = await Promise.all([
    sb.from('assignments').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
    sb.from('student_profiles').select('user_id, name, class_code').in('class_code', classCodes)
  ]);

  let sessions = [];
  if (profiles?.length) {
    const { data } = await sb.from('reading_sessions')
      .select('student_id, book_title')
      .in('student_id', profiles.map(p => p.user_id));
    sessions = data || [];
  }

  renderAssignmentsAdmin(assignments || [], profiles || [], sessions);
}

function assignmentCompletionHtml(assignment, profiles, sessions) {
  const classStudents = profiles.filter(p => p.class_code === assignment.class_code);
  if (!classStudents.length) return '';

  const completedIds = new Set(
    sessions
      .filter(s => s.book_title.toLowerCase() === assignment.book_title.toLowerCase())
      .map(s => s.student_id)
  );

  const done = classStudents.filter(p => completedIds.has(p.user_id));
  const notDone = classStudents.filter(p => !completedIds.has(p.user_id));
  const pct = Math.round((done.length / classStudents.length) * 100);
  const waitingOn = notDone.length
    ? `<div style="font-size:0.72rem;color:#888;margin-top:0.2rem">Waiting on: ${notDone.map(p => p.name).join(', ')}</div>`
    : '<div style="font-size:0.72rem;color:#2e7d32;margin-top:0.2rem;font-weight:600">✓ Everyone is done!</div>';

  return `
    <div style="margin-top:0.5rem">
      <div class="assign-progress-wrap">
        <div class="assign-progress-bar" style="width:${pct}%"></div>
      </div>
      <div style="font-size:0.75rem;color:#555;margin-top:0.25rem">${done.length} of ${classStudents.length} students completed</div>
      ${waitingOn}
    </div>`;
}

function formatDueDate(dueDateStr) {
  if (!dueDateStr) return '';
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((due - today) / 86400000);
  if (daysUntil < 0) return `<span style="color:#c62828;font-weight:700">Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}</span>`;
  if (daysUntil === 0) return `<span style="color:#c62828;font-weight:700">Due today!</span>`;
  if (daysUntil === 1) return `<span style="color:#e65100;font-weight:700">Due tomorrow</span>`;
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function renderAssignmentsAdmin(assignments, profiles, sessions) {
  const el = document.getElementById('assignmentsAdmin');
  if (!el) return;

  const classOptions = teacherClasses.map(c =>
    `<option value="${c.class_code}">${c.class_name}</option>`
  ).join('');

  const todayStr = new Date().toISOString().split('T')[0];

  const list = assignments.length
    ? assignments.map(a => {
        const cls = teacherClasses.find(c => c.class_code === a.class_code)?.class_name || a.class_code;
        const due = a.due_date ? ` · ${formatDueDate(a.due_date)}` : '';
        const completion = assignmentCompletionHtml(a, profiles, sessions);
        return `
          <div class="assignment-row">
            <div style="flex:1">
              <div class="assignment-title">${a.book_title}</div>
              <div class="assignment-class">→ ${cls}${due}</div>
              ${completion}
            </div>
            <button class="btn-danger" onclick="removeAssignment('${a.id}')">Remove</button>
          </div>`;
      }).join('')
    : '<p style="color:#aaa;font-size:0.82rem">No active assignments.</p>';

  el.innerHTML = `
    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #eee">
      <h3 style="font-size:0.95rem;margin-bottom:1rem;color:#1a3a5c">Assign a Book</h3>
      <p style="font-size:0.78rem;color:#888;margin-bottom:0.75rem">Assigned books appear at the top of students' library with a deadline badge.</p>
      <div class="form-group">
        <label>Book title</label>
        <input type="text" id="assignBookTitle" placeholder="e.g. Charlotte's Web" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="form-group">
          <label>Class</label>
          <select id="assignClassCode">${classOptions}</select>
        </div>
        <div class="form-group">
          <label>Due date (optional)</label>
          <input type="date" id="assignDueDate" min="${todayStr}" />
        </div>
      </div>
      <button class="btn-primary" onclick="assignBook()" style="margin-bottom:1.5rem">📌 Assign to class</button>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem;color:#1a3a5c">Active Assignments</h3>
      ${list}
    </div>`;
}

async function assignBook() {
  const title = document.getElementById('assignBookTitle').value.trim();
  const classCode = document.getElementById('assignClassCode').value;
  const dueDate = document.getElementById('assignDueDate').value || null;
  if (!title) { alert('Please enter a book title.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('assignments').insert({
    teacher_id: user.id, class_code: classCode, book_title: title, due_date: dueDate
  });
  if (error) { alert('Could not save assignment.'); return; }
  document.getElementById('assignBookTitle').value = '';
  document.getElementById('assignDueDate').value = '';
  await loadAssignmentsAdmin();
}

async function removeAssignment(id) {
  if (!confirm('Remove this assignment?')) return;
  await sb.from('assignments').delete().eq('id', id);
  await loadAssignmentsAdmin();
}

// ── Weekly Student Summaries ──────────────────────────────────────────────────

async function generateWeeklySummaries() {
  const profiles = window._analyticsProfiles;
  const byStudent = window._analyticsByStudent;
  if (!profiles?.length) return;

  const btn = document.getElementById('weeklySummaryBtn');
  const output = document.getElementById('weeklySummariesOutput');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const cards = [];
  for (const profile of profiles) {
    const allSessions = byStudent[profile.user_id] || [];
    const weekSessions = allSessions.filter(s => new Date(s.created_at) >= sevenDaysAgo);

    btn.textContent = `Writing ${profile.name}'s summary...`;

    let summary;
    if (!weekSessions.length) {
      summary = `${profile.name} did not have any recorded reading sessions this week.`;
    } else {
      summary = await generateStudentSummary(profile, weekSessions, allSessions);
    }

    cards.push({ name: profile.name, grade: profile.grade, summary, sessionCount: weekSessions.length });
  }

  renderWeeklySummaries(cards);
  btn.disabled = false;
  btn.textContent = '📧 Regenerate';
}

async function generateStudentSummary(profile, weekSessions, allSessions) {
  const avg = Math.round(weekSessions.reduce((s, x) => s + x.overall_score, 0) / weekSessions.length);
  const books = [...new Set(weekSessions.map(s => s.book_title.replace(/ \(Page \d+\)$/, '')))];
  const hardWords = [...new Set(weekSessions.flatMap(s => s.difficult_words || [])
    .map(w => typeof w === 'string' ? w : w?.word)
    .filter(Boolean))].slice(0, 3);

  const prevSessions = allSessions.filter(s => {
    const d = new Date(s.created_at);
    return d < new Date(Date.now() - 7 * 86400000) && d >= new Date(Date.now() - 14 * 86400000);
  });
  const prevAvg = prevSessions.length
    ? Math.round(prevSessions.reduce((s, x) => s + x.overall_score, 0) / prevSessions.length)
    : null;
  const trend = prevAvg !== null
    ? avg > prevAvg + 5 ? 'improving' : avg < prevAvg - 5 ? 'declining slightly' : 'steady'
    : null;

  const sys = `You are a literacy teacher writing a brief weekly reading update for a parent.
Write exactly 2-3 warm, professional sentences. Be specific and encouraging.
Do not use bullet points. Do not address the parent directly. Write about the student in third person.
Do not start with "This week" — vary your opening.`;

  const msg = `Student: ${profile.name}, Grade ${profile.grade}
This week: read ${weekSessions.length} session${weekSessions.length > 1 ? 's' : ''}, average score ${avg}%
Books: ${books.join(', ')}
${hardWords.length ? `Words to work on: ${hardWords.join(', ')}` : 'No significant pronunciation issues'}
${trend ? `Compared to last week: ${trend}` : ''}
Write a parent-facing summary of this student's reading week.`;

  try {
    const { data, error } = await sb.functions.invoke('ibm-chat', {
      body: {
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: msg }
        ],
        project_id: IBM_PROJECT_ID,
        max_tokens: 150
      }
    });
    if (error) throw error;
    return data.content?.trim()
      || `${profile.name} completed ${weekSessions.length} reading session${weekSessions.length > 1 ? 's' : ''} this week with an average score of ${avg}%.`;
  } catch {
    return `${profile.name} completed ${weekSessions.length} reading session${weekSessions.length > 1 ? 's' : ''} this week with an average score of ${avg}%.`;
  }
}

function renderWeeklySummaries(cards) {
  const output = document.getElementById('weeklySummariesOutput');
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const rows = cards.map(c => {
    const escaped = c.summary.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const noReading = c.sessionCount === 0;
    return `
      <div class="weekly-summary-row ${noReading ? 'weekly-summary-inactive' : ''}">
        <div class="weekly-summary-meta">
          <div class="weekly-summary-name">${c.name}</div>
          <div class="weekly-summary-grade">Grade ${c.grade} · ${c.sessionCount} session${c.sessionCount !== 1 ? 's' : ''} this week</div>
        </div>
        <div class="weekly-summary-text">${escaped}</div>
        <button class="weekly-copy-btn" onclick="copyWeeklySummary(this, '${escaped.replace(/'/g, "\\'")}')">Copy</button>
      </div>`;
  }).join('');

  output.innerHTML = `
    <div class="analytics-section" style="margin-top:1.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <h3 class="analytics-heading" style="margin-bottom:0">Weekly Parent Summaries</h3>
        <span style="font-size:0.72rem;color:#aaa">Week of ${dateStr}</span>
      </div>
      <p style="font-size:0.78rem;color:#888;margin-bottom:1rem">Generated by IBM Granite — copy each summary into a parent email or newsletter.</p>
      ${rows}
    </div>`;
}

function copyWeeklySummary(btn, text) {
  navigator.clipboard.writeText(text);
  btn.textContent = 'Copied!';
  setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
}

// ── Teacher Notes ─────────────────────────────────────────────────────────────

let _notesStudentId = null;

async function openStudentNotes(studentId) {
  const profile = window._studentProfiles?.[studentId];
  _notesStudentId = studentId;
  document.getElementById('notesStudentName').innerText = profile?.name || 'Student';
  document.getElementById('notesInput').value = '';
  document.getElementById('notesList').innerHTML =
    '<div style="color:#aaa;font-size:0.82rem;padding:0.5rem 0">Loading...</div>';
  document.getElementById('notesModal').classList.add('open');
  await loadNotes();
}

async function loadNotes() {
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from('teacher_notes')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', _notesStudentId)
    .order('created_at', { ascending: false });

  const notes = data || [];
  if (!notes.length) {
    document.getElementById('notesList').innerHTML =
      '<div style="color:#aaa;font-size:0.82rem;padding:0.5rem 0">No notes yet. Add your first note below.</div>';
    return;
  }

  document.getElementById('notesList').innerHTML = notes.map(n => {
    const date = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const escaped = n.note.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="note-row">
        <div class="note-content">
          <div class="note-date">${date}</div>
          <div class="note-text">${escaped}</div>
        </div>
        <button class="note-delete-btn" onclick="deleteNote('${n.id}')" title="Delete note">×</button>
      </div>`;
  }).join('');
}

async function saveNote() {
  const text = document.getElementById('notesInput').value.trim();
  if (!text) return;
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('teacher_notes').insert({
    teacher_id: user.id,
    student_id: _notesStudentId,
    note: text
  });
  if (error) { alert('Could not save note.'); return; }
  document.getElementById('notesInput').value = '';
  await loadNotes();
}

async function deleteNote(id) {
  await sb.from('teacher_notes').delete().eq('id', id);
  await loadNotes();
}

function closeNotesModal() {
  document.getElementById('notesModal').classList.remove('open');
  _notesStudentId = null;
}
