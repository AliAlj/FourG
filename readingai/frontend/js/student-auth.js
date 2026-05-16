function switchStudentTab(tab) {
  const isSignUp = tab === 'signup';
  document.getElementById('signUpForm').style.display = isSignUp ? 'block' : 'none';
  document.getElementById('signInForm').style.display = isSignUp ? 'none' : 'block';
  document.getElementById('tabSignUp').classList.toggle('active', isSignUp);
  document.getElementById('tabSignIn').classList.toggle('active', !isSignUp);
}

async function studentSignUp() {
  const name = document.getElementById('sName').value.trim();
  const grade = 4;
  const code = document.getElementById('sClassCode').value.trim().toUpperCase();
  const email = document.getElementById('sEmail').value.trim();
  const password = document.getElementById('sPassword').value;

  if (!name || !code || !email || !password) {
    showError('signUpError', 'Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    showError('signUpError', 'Password must be at least 6 characters.');
    return;
  }

  const { data: classData, error: classError } = await sb.from('classes')
    .select('class_name').eq('class_code', code).single();
  if (classError || !classData) {
    showError('signUpError', 'Class code not found. Ask your teacher for the right code.');
    return;
  }

  const { data: authData, error: authError } = await sb.auth.signUp({ email, password });
  if (authError) {
    showError('signUpError', authError.message);
    return;
  }

  await sb.from('student_profiles').insert({
    user_id: authData.user.id,
    name,
    grade,
    class_code: code,
    class_name: classData.class_name
  });

  currentStudent = { name, grade, userId: authData.user.id };
  currentClassCode = code;
  currentClassName = classData.class_name;
  setStudentHeader(name);
  goToLibrary();
}

async function studentSignIn() {
  const email = document.getElementById('sEmailIn').value.trim();
  const password = document.getElementById('sPasswordIn').value;

  if (!email || !password) {
    showError('signInError', 'Please fill in all fields.');
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    showError('signInError', error.message);
    return;
  }

  const { data: profile, error: profileError } = await sb.from('student_profiles')
    .select('*').eq('user_id', data.user.id).single();
  if (profileError || !profile) {
    showError('signInError', 'No student account found for this email. Please sign up first.');
    await sb.auth.signOut();
    return;
  }

  currentStudent = { name: profile.name, grade: profile.grade, userId: data.user.id };
  currentClassCode = profile.class_code || '';
  currentClassName = profile.class_name || '';
  setStudentHeader(profile.name);
  goToLibrary();
}

async function studentSignOut() {
  await sb.auth.signOut();
  currentStudent = {};
  currentClassCode = '';
  currentClassName = '';
  document.getElementById('headerRight').innerHTML = '';
  showScreen('roleScreen');
}

function setStudentHeader(name) {
  document.getElementById('headerRight').innerHTML =
    `<div style="display:flex;align-items:center;gap:0.75rem">
      <span style="font-size:0.82rem;opacity:0.8">Hi ${name}!</span>
      <button onclick="studentSignOut()" style="padding:0.3rem 0.7rem;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:white;border-radius:6px;font-size:0.72rem;cursor:pointer;font-family:inherit">Sign out</button>
    </div>`;
}

// Restore session on page load
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: profile } = await sb.from('student_profiles')
    .select('*').eq('user_id', session.user.id).single();
  sessionRestored = true;
  if (profile) {
    currentStudent = { name: profile.name, grade: profile.grade, userId: session.user.id };
    currentClassCode = profile.class_code || '';
    currentClassName = profile.class_name || '';
    setStudentHeader(profile.name);
    goToLibrary();
  } else {
    setTeacherHeader(session.user.email);
    showScreen('teacherDashboardScreen');
    await loadClasses();
  }
})();
