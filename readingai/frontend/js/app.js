function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });

  document.getElementById(id).classList.add('active');

  document.body.classList.toggle('splash-active', id === 'loadingScreen');
  document.body.classList.toggle('role-active', id === 'roleScreen');
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    showScreen('roleScreen');
  }, 2200);
});

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
function nextPassage() { goToLibrary(); }
