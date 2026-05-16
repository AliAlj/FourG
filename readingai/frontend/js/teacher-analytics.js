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
  const { data: sessions } = await sb.from('reading_sessions')
    .select('*').in('student_id', studentIds).order('created_at', { ascending: false });

  const allReadingSessions = sessions || [];
  const byStudent = {};
  allReadingSessions.forEach(s => {
    if (!byStudent[s.student_id]) byStudent[s.student_id] = [];
    byStudent[s.student_id].push(s);
  });

  renderStudentOverviewCards(profiles, byStudent);
  renderClassWordsHeatmap(allReadingSessions);
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

function renderStudentOverviewCards(profiles, byStudent) {
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const cards = profiles.map(p => {
    const sessions = byStudent[p.user_id] || [];
    const avg = sessions.length
      ? Math.round(sessions.reduce((s, x) => s + x.overall_score, 0) / sessions.length)
      : null;
    const trend = analyticsTrend(sessions);
    const lastDate = sessions[0] ? new Date(sessions[0].created_at) : null;
    const inactive = !lastDate || lastDate < weekAgo;
    const trendColor = trend === '↑' ? '#2e7d32' : trend === '↓' ? '#c62828' : '#888';

    return `<div class="soc ${inactive ? 'soc-inactive' : ''}">
      <div class="soc-top">
        <div>
          <div class="soc-name">${p.name}</div>
          <div class="soc-grade">Grade ${p.grade}</div>
        </div>
        <div style="text-align:right">
          <div class="soc-score" style="color:${avg !== null ? analyticsScoreColor(avg) : '#bbb'}">${avg !== null ? avg + '%' : '—'}</div>
          <div class="soc-trend" style="color:${trendColor}">${trend}</div>
        </div>
      </div>
      <div class="soc-footer ${inactive ? 'soc-warn' : ''}">
        ${inactive
          ? "⚠️ Hasn't read this week"
          : lastDate
            ? 'Last read ' + lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'No readings yet'}
      </div>
    </div>`;
  }).join('');

  document.getElementById('analyticsOverview').innerHTML = `
    <div class="analytics-section">
      <h3 class="analytics-heading">Student Overview</h3>
      <div class="soc-grid">${cards}</div>
    </div>`;
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
    </div>`;
}

// Assignments
async function loadAssignmentsAdmin() {
  const el = document.getElementById('assignmentsAdmin');
  if (!el || !teacherClasses.length) return;

  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from('assignments')
    .select('*').eq('teacher_id', user.id).order('created_at', { ascending: false });

  renderAssignmentsAdmin(data || []);
}

function renderAssignmentsAdmin(assignments) {
  const el = document.getElementById('assignmentsAdmin');
  if (!el) return;

  const classOptions = teacherClasses.map(c =>
    `<option value="${c.class_code}">${c.class_name}</option>`
  ).join('');

  const list = assignments.length
    ? assignments.map(a => {
        const cls = teacherClasses.find(c => c.class_code === a.class_code)?.class_name || a.class_code;
        return `<div class="assignment-row">
          <div>
            <div class="assignment-title">${a.book_title}</div>
            <div class="assignment-class">→ ${cls}</div>
          </div>
          <button class="btn-danger" onclick="removeAssignment('${a.id}')">Remove</button>
        </div>`;
      }).join('')
    : '<p style="color:#aaa;font-size:0.82rem">No active assignments.</p>';

  el.innerHTML = `
    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #eee">
      <h3 style="font-size:0.95rem;margin-bottom:1rem;color:#1a3a5c">Assign a Book</h3>
      <p style="font-size:0.78rem;color:#888;margin-bottom:0.75rem">Assigned books appear at the top of students' library with a 📌 badge.</p>
      <div class="form-group">
        <label>Book title</label>
        <input type="text" id="assignBookTitle" placeholder="e.g. The Great Fire" />
      </div>
      <div class="form-group">
        <label>Class</label>
        <select id="assignClassCode">${classOptions}</select>
      </div>
      <button class="btn-primary" onclick="assignBook()" style="margin-bottom:1.5rem">📌 Assign to class</button>
      <h3 style="font-size:0.95rem;margin-bottom:0.75rem;color:#1a3a5c">Active Assignments</h3>
      ${list}
    </div>`;
}

async function assignBook() {
  const title = document.getElementById('assignBookTitle').value.trim();
  const classCode = document.getElementById('assignClassCode').value;
  if (!title) { alert('Please enter a book title.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('assignments').insert({ teacher_id: user.id, class_code: classCode, book_title: title });
  if (error) { alert('Could not save assignment.'); return; }
  document.getElementById('assignBookTitle').value = '';
  await loadAssignmentsAdmin();
}

async function removeAssignment(id) {
  if (!confirm('Remove this assignment?')) return;
  await sb.from('assignments').delete().eq('id', id);
  await loadAssignmentsAdmin();
}
