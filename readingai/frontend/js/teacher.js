function setTeacherHeader(email) {
  const label = email.split('@')[0];
  document.getElementById('headerRight').innerHTML =
    `<div style="display:flex;align-items:center;gap:0.75rem">
      <span style="font-size:0.82rem;opacity:0.8">Hi ${label}!</span>
      <button onclick="teacherLogout()" style="padding:0.3rem 0.7rem;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:white;border-radius:6px;font-size:0.72rem;cursor:pointer;font-family:inherit">Sign out</button>
    </div>`;
}

async function teacherLogin() {
  const email = document.getElementById('teacherEmail').value.trim();
  const password = document.getElementById('teacherPassword').value;
  if (!email || !password) return showError('authError', 'Please fill in all fields.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return showError('authError', error.message);
  setTeacherHeader(data.user.email);
  showScreen('teacherDashboardScreen');
  await loadClasses();
}

async function teacherSignup() {
  const email = document.getElementById('teacherEmail').value.trim();
  const password = document.getElementById('teacherPassword').value;
  if (!email || !password) return showError('authError', 'Please fill in all fields.');
  if (password.length < 6) return showError('authError', 'Password must be at least 6 characters.');
  const { error } = await sb.auth.signUp({ email, password });
  if (error) return showError('authError', error.message);
  showSuccess('authSuccess', 'Account created! You can now sign in.');
}

async function teacherLogout() {
  await sb.auth.signOut();
  document.getElementById('headerRight').innerHTML = '';
  document.getElementById('libraryAdminCard').style.display = 'none';
  showScreen('roleScreen');
}

function showCreateClass() { document.getElementById('createClassForm').style.display = 'block'; }
function hideCreateClass() {
  document.getElementById('createClassForm').style.display = 'none';
  document.getElementById('newClassName').value = '';
}

async function createClass() {
  const name = document.getElementById('newClassName').value.trim();
  const grade = parseInt(document.getElementById('newClassGrade').value);
  if (!name) { alert('Please enter a class name.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const code = generateCode();
  const { error } = await sb.from('classes').insert({ teacher_id: user.id, class_name: name, class_code: code, grade });
  if (error) { alert('Could not create class: ' + error.message); return; }
  window.currentClassGrade = grade;
  hideCreateClass();
  await loadClasses();
  showBookSuggestions(grade, code);
}

function showBookSuggestions(grade, classCode) {
  const box = document.getElementById('bookSuggestions');
  const list = document.getElementById('bookSuggestionsList');
  const matches = passages.filter(p => p.grade === grade);
  if (!matches.length) { box.style.display = 'none'; return; }
  list.innerHTML = matches.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:white;border-radius:8px;margin-bottom:0.5rem;gap:1rem">
      <div>
        <div style="font-weight:700;font-size:0.88rem;color:#1a3a5c">${p.title}</div>
        <div style="font-size:0.75rem;color:#888">Grade ${p.grade} · ${p.topic}</div>
      </div>
      <button onclick="quickAssign('${p.title.replace(/'/g,"\\'")}','${classCode}')" style="padding:0.35rem 0.8rem;background:#2e7d32;color:white;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">📌 Assign</button>
    </div>`).join('');
  box.style.display = 'block';
}

async function quickAssign(title, classCode) {
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('assignments').insert({ teacher_id: user.id, class_code: classCode, book_title: title });
  if (error) { alert('Could not assign book.'); return; }
  alert(`"${title}" assigned to class!`);
  await loadAssignmentsAdmin();
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function loadClasses() {
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from('classes').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false });
  teacherClasses = data || [];
  const list = document.getElementById('classList');
  if (!teacherClasses.length) {
    list.innerHTML = '<p style="color:#aaa;font-size:0.88rem">No classes yet. Create your first class above.</p>';
    document.getElementById('studentsDashboard').style.display = 'none';
    return;
  }
  list.innerHTML = teacherClasses.map(cls => `
    <div class="class-item">
      <div>
        <div class="class-item-name">${cls.class_name}</div>
        <div class="class-item-code">${cls.class_code}</div>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <button onclick="copyCode('${cls.class_code}')" style="padding:0.35rem 0.75rem;background:#f0f5ff;border:1.5px solid #c8d8f0;border-radius:6px;font-size:0.75rem;font-weight:600;color:#1a3a5c;cursor:pointer;font-family:inherit">Copy code</button>
        <button onclick="openClassDashboard('${cls.class_code}','${cls.class_name}')" style="padding:0.35rem 0.75rem;background:#1a3a5c;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;color:white;cursor:pointer;font-family:inherit">View students</button>
      </div>
    </div>`).join('');
  await loadLibraryAdmin();
  await loadAssignmentsAdmin();
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert(`Copied! Share code ${code} with your students.`);
}

async function openClassDashboard(code, name) {
  const { data } = await sb.from('student_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  allSessions = data || [];

  document.getElementById('studentsDashboard').style.display = 'block';
  document.getElementById('dashboardHeader').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:#1a3a5c">${name}</div>
        <div style="font-size:0.78rem;color:#f0a500;font-weight:700;letter-spacing:0.1em">${code}</div>
      </div>
      <button class="btn-secondary" onclick="document.getElementById('studentsDashboard').style.display='none'">Close</button>
    </div>`;

  await loadClassAnalytics(code);
  buildTeacherTabs(code);
  document.getElementById('studentsDashboard').scrollIntoView({ behavior: 'smooth' });
}

function buildTeacherTabs(selectedCode) {
  const tabsEl = document.getElementById('teacherTabs');
  const tabs = [{ id: 'all', label: 'All Students' }];
  teacherClasses.forEach(cls => tabs.push({ id: cls.class_code, label: cls.class_name }));
  tabs.push({ id: 'help', label: 'Needs Help' });

  tabsEl.innerHTML = tabs.map(t =>
    `<button class="teacher-tab ${t.id === selectedCode || (t.id === 'all' && !selectedCode) ? 'active' : ''}"
      onclick="switchTeacherTab('${t.id}', this)">${t.label}</button>`
  ).join('');

  renderStudents(selectedCode);
}

function switchTeacherTab(tabId, btn) {
  document.querySelectorAll('.teacher-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderStudents(tabId);
}

function renderStudents(filter) {
  let sessions = allSessions;
  if (filter === 'help') sessions = allSessions.filter(s => s.overall < 70);
  else if (filter !== 'all') sessions = allSessions.filter(s => s.class_code === filter);

  const list = document.getElementById('studentsList');
  if (!sessions.length) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>No students in this category yet.</p></div>`;
    return;
  }

  list.innerHTML = sessions.map(s => {
    const cls = s.overall >= 85 ? 'score-high' : s.overall >= 70 ? 'score-mid' : 'score-low';
    const date = new Date(s.created_at).toLocaleDateString();
    const className = teacherClasses.find(c => c.class_code === s.class_code)?.class_name || s.class_code;
    const words = s.difficult_words && s.difficult_words.length > 0
      ? s.difficult_words.map(w => `<span class="diff-word-chip">${w.word} ${w.score}%</span>`).join('')
      : '<span style="font-size:0.75rem;color:#aaa">No difficult words</span>';
    return `
      <div class="student-card" onclick="openStudentDetail(${JSON.stringify(s).replace(/"/g, '&quot;')})">
        <div class="student-card-top">
          <div>
            <div class="student-card-name">${s.student_name}</div>
            <div class="student-card-meta">Grade ${s.grade} · ${s.passage_title} · ${date}</div>
            <span class="class-badge">${className}</span>
          </div>
          <div class="score-pill ${cls}">${s.overall}%</div>
        </div>
        <div class="difficult-words-row">${words}</div>
      </div>`;
  }).join('');
}

function openStudentDetail(session) {
  const className = teacherClasses.find(c => c.class_code === session.class_code)?.class_name || session.class_code;
  document.getElementById('detailName').innerText = session.student_name;
  document.getElementById('detailMeta').innerText = `Grade ${session.grade} · ${className} · ${new Date(session.created_at).toLocaleDateString()}`;

  const cls = session.overall >= 85 ? 'score-high' : session.overall >= 70 ? 'score-mid' : 'score-low';
  document.getElementById('detailScores').innerHTML = `
    <div class="score-badge"><div class="num">${session.accuracy}</div><div class="lbl">Accuracy</div></div>
    <div class="score-badge"><div class="num">${session.fluency}</div><div class="lbl">Fluency</div></div>
    <div class="score-badge"><div class="num">${session.completeness}</div><div class="lbl">Completeness</div></div>
    <div class="score-badge ${cls}"><div class="num">${session.overall}</div><div class="lbl">Overall</div></div>`;

  const words = session.difficult_words || [];
  if (words.length > 0) {
    document.getElementById('detailWordsSection').style.display = 'block';
    document.getElementById('detailWords').innerHTML = words.map(w => {
      const wCls = w.score < 50 ? 'bad' : 'ok';
      return `<span class="detail-word-chip ${wCls}">
        ${w.word} · ${w.score}%
        ${w.pos ? `· <em>${w.pos}</em>` : ''}
        ${w.definition ? `<br><span style="font-weight:400;font-style:normal">${w.definition}</span>` : ''}
      </span>`;
    }).join('');
  } else {
    document.getElementById('detailWordsSection').style.display = 'none';
  }

  document.getElementById('detailFeedback').innerText = session.feedback || 'No feedback recorded.';
  document.getElementById('detailPassage').innerText = session.passage_title;
  document.getElementById('studentModal').classList.add('open');
}

function closeStudentModal() { document.getElementById('studentModal').classList.remove('open'); }
