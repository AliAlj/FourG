async function teacherLogin() {
  const email = document.getElementById('teacherEmail').value.trim();
  const password = document.getElementById('teacherPassword').value;
  if (!email || !password) return showError('authError', 'Please fill in all fields.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return showError('authError', error.message);
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
  if (!name) { alert('Please enter a class name.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const code = generateCode();
  const { error } = await sb.from('classes').insert({ teacher_id: user.id, class_name: name, class_code: code });
  if (error) { alert('Could not create class: ' + error.message); return; }
  hideCreateClass();
  await loadClasses();
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getStars(score) {
  const count = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  let stars = "";

  for (let i = 0; i < 3; i++) {
    stars += `<span class="${i < count ? "star-gold" : "star-gray"}">★</span>`;
  }

  return stars;
}

async function loadClasses() {
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from('classes').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false });

  teacherClasses = data || [];
  const list = document.getElementById('classList');

  if (!teacherClasses.length) {
    list.innerHTML = `
      <div class="teacher-dashboard-shell">
        <div class="teacher-dashboard-top">
          <div></div>
          <div class="teacher-title">Teacher Dashboard</div>
          <button class="teacher-signout-btn" onclick="teacherLogout()">Sign Out</button>
        </div>

        <div class="teacher-empty-message">No classes yet. Create your first class.</div>
      </div>
    `;

    document.getElementById('studentsDashboard').style.display = 'none';
    document.getElementById('libraryAdminCard').style.display = 'none';
    return;
  }

  const firstClass = teacherClasses[0];

  list.innerHTML = `
    <div class="teacher-dashboard-shell">
      <div class="teacher-dashboard-top">
        <button class="teacher-class-code" onclick="copyCode('${firstClass.class_code}')">
          Class Code : ${firstClass.class_code}
        </button>

        <div class="teacher-title">Teacher Dashboard</div>

        <button class="teacher-signout-btn" onclick="teacherLogout()">Sign Out</button>
      </div>
    </div>
  `;

  await loadLibraryAdmin();
  await openClassDashboard(firstClass.class_code, firstClass.class_name);
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
  document.getElementById('dashboardHeader').innerHTML = "";

  buildTeacherTabs(code);
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

  if (filter === 'help') {
    sessions = allSessions.filter(s => s.overall < 70);
  } else if (filter !== 'all') {
    sessions = allSessions.filter(s => s.class_code === filter);
  }

  const list = document.getElementById('studentsList');

  if (!sessions.length) {
    list.innerHTML = `
      <div class="teacher-student-panel">
        <div class="teacher-empty-message">No students yet.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="teacher-student-panel">
      <div class="teacher-student-grid">
        ${sessions.map(s => {
          const safeSession = JSON.stringify(s).replace(/'/g, "&#39;");
          return `
            <div class="teacher-student-row">
              <div class="student-avatar"></div>

              <button class="teacher-student-pill" onclick='openStudentDetail(${safeSession})'>
                <span class="teacher-student-name">${s.student_name}</span>
                <span class="teacher-student-score">${s.overall}%</span>
                <span class="teacher-stars">${getStars(s.overall)}</span>
                <span class="teacher-arrow">→</span>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function openStudentDetail(session) {
  const className = teacherClasses.find(c => c.class_code === session.class_code)?.class_name || session.class_code;

  document.getElementById('detailName').innerText = session.student_name;
  document.getElementById('detailMeta').innerText = `Grade ${session.grade} · ${className} · ${new Date(session.created_at).toLocaleDateString()}`;

  document.getElementById('detailScores').innerHTML = `
    <div class="score-badge"><div class="num">${session.accuracy}</div><div class="lbl">Accuracy</div></div>
    <div class="score-badge"><div class="num">${session.fluency}</div><div class="lbl">Fluency</div></div>
    <div class="score-badge"><div class="num">${session.completeness}</div><div class="lbl">Completeness</div></div>
    <div class="score-badge gold"><div class="num">${session.overall}</div><div class="lbl">Overall</div></div>`;

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

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('open');
}