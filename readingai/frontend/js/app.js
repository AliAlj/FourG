function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.innerText = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.innerText = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

async function verifyClassCode() {
  const code = document.getElementById('classCodeInput').value.trim().toUpperCase();
  if (!code || code.length < 4) {
    showError('codeError', 'Please enter a valid class code.');
    return;
  }
  const { data, error } = await sb.from('classes').select('class_name').eq('class_code', code).single();
  if (error || !data) {
    showError('codeError', 'Class code not found. Please check with your teacher.');
    return;
  }
  currentClassCode = code;
  currentClassName = data.class_name;
  document.getElementById('setupWelcome').innerText = `Welcome to ${data.class_name}!`;
  showScreen('studentSetupScreen');
}

function startReading() {
  const name = document.getElementById('studentName').value.trim();
  const grade = parseInt(document.getElementById('studentGrade').value);
  if (!name) { alert('Please enter your name.'); return; }
  currentStudent = { name, grade };
  currentPassageIndex = 0;
  loadPassage();
  showScreen('readingScreen');
  document.getElementById('headerRight').innerHTML =
    `<span style="font-size:0.82rem;opacity:0.8">Hi ${name}! 👋</span>`;
}

function loadPassage() {
  const available = passages.filter(p => p.grade <= currentStudent.grade);
  const passage = available[currentPassageIndex % available.length];
  document.getElementById('passageGradeLabel').innerText = `Grade ${passage.grade} Passage`;
  document.getElementById('passageTopicBadge').innerText = passage.topic;
  document.getElementById('passageTitle').innerText = passage.title;
  document.getElementById('passageText').innerText = passage.text;
  const chips = document.getElementById('passageChips');
  chips.innerHTML = available.map((p, i) =>
    `<button class="passage-chip ${i === currentPassageIndex % available.length ? 'active' : ''}"
      onclick="selectPassage(${i})">${p.topic}</button>`
  ).join('');
  resetReadingState();
}

function selectPassage(i) { currentPassageIndex = i; loadPassage(); }

function resetReadingState() {
  document.getElementById('transcriptBox').innerText = 'Your reading will appear here as you speak...';
  document.getElementById('micLabel').innerText = 'Tap the microphone and read the passage out loud';
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('statusMsg').innerText = '';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('feedbackCard').style.display = 'none';
  document.getElementById('speakingBar').classList.remove('active');
  isRecording = false;
}

function tryAgain() { resetReadingState(); }
function nextPassage() { currentPassageIndex++; loadPassage(); }
