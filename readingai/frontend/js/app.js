function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('preferredLanguage', lang);
  document.getElementById('langEn')?.classList.toggle('lang-active', lang === 'en');
  document.getElementById('langEs')?.classList.toggle('lang-active', lang === 'es');
  document.querySelectorAll('[data-en][data-es]').forEach(el => {
    el.textContent = lang === 'es' ? el.dataset.es : el.dataset.en;
  });
}

function showScreen(id) {
  const currentScreen = document.querySelector('.screen.active');
  const nextScreen = document.getElementById(id);

  if (currentScreen === nextScreen) return;

  currentScreenId = id;

  if (currentScreen) {
    currentScreen.style.opacity = '0';
    currentScreen.style.transform = 'translateY(-12px)';
    currentScreen.style.transition = 'opacity 0.22s ease, transform 0.22s ease';

    setTimeout(() => {
      currentScreen.classList.remove('active');
      currentScreen.style.opacity = '';
      currentScreen.style.transform = '';
      currentScreen.style.transition = '';

      nextScreen.classList.add('active');
    }, 230);
  } else {
    nextScreen.classList.add('active');
  }

  document.body.classList.toggle('splash-active', id === 'loadingScreen');
  document.body.classList.toggle('role-active', id === 'roleScreen');
  currentScreenId = id;
  if (id !== 'roleScreen') {
    const bubble = document.getElementById('wormSpeechBubble');
    if (bubble) bubble.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLanguage);
  setTimeout(() => {
    if (!sessionRestored) {
      showScreen('roleScreen');
      setTimeout(openBookwormIntro, 600);
    }
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
  cleanupRecordingAudio();
}

function tryAgain() {
  stopReadAlong();
  resetReadingState();
  const el = document.getElementById('passageText');
  if (el && el.innerText.trim()) renderTextAsWordSpans(el.innerText, 'passageText');
  document.getElementById('rereadHistory').style.display = 'none';
}
function nextPassage() { goToLibrary(); }
