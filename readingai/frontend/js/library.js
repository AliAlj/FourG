async function goToLibrary() {
  showScreen('libraryScreen');
  document.getElementById('libraryWelcome').innerText =
    `Hi ${currentStudent.name}! Choose a book to read out loud.`;
  await loadLibraryBooks();
}

async function loadLibraryBooks() {
  document.getElementById('libraryLoading').style.display = 'block';
  document.getElementById('libraryGrid').innerHTML = '';
  let allBooks = [
    ...illustratedBooks.map(b => ({ ...b, source: 'illustrated', text: b.pages.map(p => p.text).join(' ') })),
    ...passages.map(p => ({ ...p, source: 'builtin' }))
  ];
  try {
    const { data } = await sb.from('library_books').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      allBooks = [...data.map(b => ({ ...b, source: 'teacher' })), ...allBooks];
    }
  } catch { }
  currentAssignments = [];
  currentCompletedBooks = new Set();
  if (currentClassCode) {
    try {
      const { data: asgn } = await sb.from('assignments')
        .select('book_title, due_date')
        .eq('class_code', currentClassCode);
      currentAssignments = asgn || [];
    } catch {}
  }
  if (currentStudent?.userId) {
    try {
      const { data: done } = await sb.from('reading_sessions')
        .select('book_title')
        .eq('student_id', currentStudent.userId);
      currentCompletedBooks = new Set((done || []).map(s => s.book_title.toLowerCase()));
    } catch {}
  }
  document.getElementById('libraryLoading').style.display = 'none';
  renderLibrary(allBooks, currentLibraryFilter);
}

function findAssignment(title) {
  return currentAssignments.find(a => a.book_title.toLowerCase() === title.toLowerCase()) || null;
}

function assignedBadgeHtml(title) {
  const asgn = findAssignment(title);
  if (!asgn) return '';

  if (currentCompletedBooks.has(title.toLowerCase())) {
    return '<span class="source-assigned-badge assign-done">📌 ✓ Done</span>';
  }

  if (!asgn.due_date) return '<span class="source-assigned-badge">📌 Assigned</span>';

  const due = new Date(asgn.due_date + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((due - today) / 86400000);

  if (daysUntil < 0)  return '<span class="source-assigned-badge assign-overdue">📌 Overdue</span>';
  if (daysUntil === 0) return '<span class="source-assigned-badge assign-urgent">📌 Due today!</span>';
  if (daysUntil === 1) return '<span class="source-assigned-badge assign-urgent">📌 Due tomorrow</span>';
  if (daysUntil <= 4) return `<span class="source-assigned-badge assign-soon">📌 Due in ${daysUntil} days</span>`;

  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `<span class="source-assigned-badge">📌 Due ${label}</span>`;
}

function renderLibrary(books, gradeFilter) {
  libraryBooks = books;
  const eligible = books.filter(b => b.grade <= currentStudent.grade);
  const sorted = [...eligible].sort((a, b) => {
    const aAssigned = findAssignment(a.title) ? 1 : 0;
    const bAssigned = findAssignment(b.title) ? 1 : 0;
    return bAssigned - aAssigned;
  });
  const filtered = gradeFilter ? sorted.filter(b => b.grade === gradeFilter) : sorted;
  const grades = [...new Set(eligible.map(b => b.grade))].sort();
  document.getElementById('libraryFilters').innerHTML =
    `<button class="library-filter-chip ${!gradeFilter ? 'active' : ''}" onclick="filterLibrary(null)">All</button>` +
    grades.map(g =>
      `<button class="library-filter-chip ${gradeFilter === g ? 'active' : ''}" onclick="filterLibrary(${g})">Grade ${g}</button>`
    ).join('');
  if (!filtered.length) {
    document.getElementById('libraryGrid').innerHTML =
      '<div class="empty-state"><div class="icon">📚</div><p>No books available yet.</p></div>';
    return;
  }
  document.getElementById('libraryGrid').innerHTML = filtered.map(book => {
    const idx = libraryBooks.indexOf(book);
    const excerpt = book.text.substring(0, 110) + '…';
    const coverClass = `grade-${Math.min(book.grade, 7)}`;
    const teacherBadge = book.source === 'teacher'
      ? '<span class="source-teacher-badge">Teacher</span>' : '';
    const illustratedBadge = book.source === 'illustrated'
      ? '<span class="source-illustrated-badge">🖼️ Illustrated</span>' : '';
    const assignedBadge = assignedBadgeHtml(book.title);
    const coverHtml = book.cover_url
      ? `<div class="book-card-img-container">
          <img src="${book.cover_url}" alt="${book.title}" onerror="this.style.display='none'">
          <div class="book-card-img-overlay">
            <span class="book-card-grade">Grade ${book.grade}</span>
            <span class="book-card-topic">${book.topic || ''}</span>
          </div>
         </div>`
      : `<div class="book-card-cover ${coverClass}">
          <span class="book-card-grade">Grade ${book.grade}</span>
          <span class="book-card-topic">${book.topic || ''}</span>
         </div>`;
    return `
      <div class="book-card" onclick="selectLibraryBook(${idx})">
        ${coverHtml}
        <div class="book-card-body">
          <div class="book-card-title">${book.title}${teacherBadge}${illustratedBadge}${assignedBadge}</div>
          ${book.author ? `<div class="book-card-author">by ${book.author}</div>` : ''}
          <div class="book-card-excerpt">${excerpt}</div>
        </div>
        <div class="book-card-footer" style="display:flex;gap:0.4rem">
          <button class="book-card-read-btn" style="flex:1">Read this book</button>
          <button onclick="event.stopPropagation();openBookwormFromLibrary(${idx})" style="padding:0.55rem 0.65rem;background:#2e7d32;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem" title="Chat with Bookworm">📚</button>
        </div>
      </div>`;
  }).join('');
}

function filterLibrary(grade) {
  currentLibraryFilter = grade;
  renderLibrary(libraryBooks, grade);
}

function selectLibraryBook(index) {
  currentBook = libraryBooks[index];
  if (currentBook.type === 'illustrated' && currentBook.pages) {
    openBookReader(currentBook);
    return;
  }
  document.getElementById('passageGradeLabel').innerText = `Grade ${currentBook.grade} Passage`;
  document.getElementById('passageTopicBadge').innerText = currentBook.topic || '';
  document.getElementById('passageTitle').innerText = currentBook.title;
  renderTextAsWordSpans(currentBook.text, 'passageText');
  document.getElementById('passageChips').innerHTML =
    `<button class="btn-secondary" onclick="goToLibrary()" style="font-size:0.78rem;padding:0.35rem 0.8rem;margin-bottom:0.5rem">&#8592; Library</button>`;
  resetReadingState();
  showScreen('readingScreen');
}

async function loadLibraryAdmin() {
  document.getElementById('libraryAdminCard').style.display = 'block';
  const { data: { user } } = await sb.auth.getUser();
  let teacherBooks = [];
  try {
    const { data } = await sb.from('library_books')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    teacherBooks = data || [];
  } catch { }
  renderLibraryAdmin(teacherBooks);
}

function renderLibraryAdmin(books) {
  const list = document.getElementById('libraryAdminList');
  if (!books.length) {
    list.innerHTML = `
      <p style="color:#aaa;font-size:0.88rem;margin-bottom:0.75rem">No books added yet. Click "+ Add book" to add a reading passage.</p>
      <div style="padding:1rem;background:#f0f5ff;border-radius:10px;font-size:0.82rem;color:#555;border-left:3px solid #1a3a5c">
        <strong>Tip:</strong> Free passages are available at Project Gutenberg (gutenberg.org) and CommonLit (commonlit.org).
      </div>`;
    return;
  }
  list.innerHTML = books.map(b =>
    `<div class="library-book-admin">
      <div>
        <div class="library-book-admin-title">${b.title}</div>
        <div class="library-book-admin-meta">Grade ${b.grade} · ${b.topic || 'General'}${b.author ? ` · by ${b.author}` : ''}</div>
      </div>
      <button class="btn-danger" onclick="deleteBook('${b.id}')">Remove</button>
    </div>`
  ).join('');
}

function debounceBookSearch(query) {
  clearTimeout(bookSearchTimeout);
  const resultsEl = document.getElementById('bookSearchResults');
  if (query.length < 3) { resultsEl.classList.remove('open'); return; }
  bookSearchTimeout = setTimeout(() => searchBooks(query), 450);
}

async function searchBooks(query) {
  const resultsEl = document.getElementById('bookSearchResults');
  resultsEl.innerHTML = '<div class="book-search-status">Searching...</div>';
  resultsEl.classList.add('open');
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,cover_i,first_publish_year`
    );
    const data = await res.json();
    renderBookSearchResults(data.docs || []);
  } catch {
    resultsEl.innerHTML = '<div class="book-search-status">Search failed — fill in the fields manually.</div>';
  }
}

function renderBookSearchResults(books) {
  const resultsEl = document.getElementById('bookSearchResults');
  if (!books.length) {
    resultsEl.innerHTML = '<div class="book-search-status">No results found.</div>';
    return;
  }
  resultsEl.innerHTML = books.map((b, i) => {
    const thumbUrl = b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg` : null;
    const author = b.author_name ? b.author_name[0] : '';
    const year = b.first_publish_year || '';
    return `
      <div class="book-search-result" onclick="selectBookResult(${i})">
        ${thumbUrl
          ? `<img class="book-search-cover" src="${thumbUrl}" alt="${b.title}">`
          : `<div class="book-search-cover-placeholder"></div>`}
        <div>
          <div class="book-search-result-title">${b.title}</div>
          ${author ? `<div class="book-search-result-author">${author}</div>` : ''}
          ${year ? `<div class="book-search-result-year">${year}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  resultsEl._bookData = books;
}

function selectBookResult(i) {
  const resultsEl = document.getElementById('bookSearchResults');
  const b = resultsEl._bookData[i];
  document.getElementById('newBookTitle').value = b.title || '';
  document.getElementById('newBookAuthor').value = b.author_name ? b.author_name[0] : '';
  document.getElementById('bookSearchInput').value = b.title || '';
  selectedBookCoverUrl = b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : '';
  resultsEl.classList.remove('open');
  lookupGutenberg(b.title || '');
}

async function lookupGutenberg(title) {
  gutenbergTextUrl = null;
  const btn = document.getElementById('gutenbergFetchBtn');
  btn.style.display = 'block';
  btn.disabled = true;
  btn.textContent = 'Checking Project Gutenberg for free text...';
  btn.style.background = '#f0f0f0';
  btn.style.color = '#888';
  btn.style.borderColor = '#ddd';
  try {
    const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(title)}`);
    const data = await res.json();
    if (!data.results || !data.results.length) { btn.style.display = 'none'; return; }
    for (const book of data.results) {
      const formats = book.formats || {};
      const textUrl = formats['text/plain; charset=utf-8'] ||
        formats['text/plain'] ||
        Object.entries(formats).find(([k]) => k.startsWith('text/plain'))?.[1];
      if (textUrl) {
        gutenbergTextUrl = textUrl;
        btn.textContent = '📖 Auto-fill text from Project Gutenberg (public domain)';
        btn.disabled = false;
        btn.style.background = '#e8f4e8';
        btn.style.color = '#2a7a4a';
        btn.style.borderColor = '#a5d6a7';
        return;
      }
    }
    btn.style.display = 'none';
  } catch (e) {
    btn.style.display = 'none';
  }
}

async function fetchGutenbergText() {
  if (!gutenbergTextUrl) return;
  const btn = document.getElementById('gutenbergFetchBtn');
  btn.textContent = 'Fetching text...';
  btn.disabled = true;

  const bookId = (gutenbergTextUrl.match(/\/(\d+)(?:\/|-0\.txt|\.txt)/) || [])[1];
  if (!bookId) {
    showGutenbergFallback(btn, null);
    return;
  }

  try {
    const { data, error } = await sb.functions.invoke('fetch-gutenberg', { body: { bookId } });
    if (error || !data?.text) throw new Error('function error');

    document.getElementById('newBookText').value = data.text;
    btn.textContent = '✓ Text loaded — trim it down to one short passage for students';
    btn.style.background = '#f0f5ff';
    btn.style.color = '#1a3a5c';
    btn.style.borderColor = '#c8d8f0';
  } catch {
    showGutenbergFallback(btn, bookId);
  }
}

function showGutenbergFallback(btn, bookId) {
  btn.textContent = 'Auto-fill failed — paste text manually (see link below)';
  btn.disabled = false;
  btn.style.background = '#fde8e8';
  btn.style.color = '#c0392b';
  btn.style.borderColor = '#e8a0a0';
  if (bookId) {
    const existing = document.getElementById('gutenbergLink');
    if (!existing) {
      const link = document.createElement('p');
      link.id = 'gutenbergLink';
      link.style.cssText = 'font-size:0.78rem;margin-top:0.5rem;color:#555';
      link.innerHTML = `Find the text at: <a href="https://www.gutenberg.org/ebooks/${bookId}" target="_blank" style="color:#1a3a5c;font-weight:600">gutenberg.org/ebooks/${bookId}</a> — open it, copy a paragraph, and paste it below.`;
      btn.parentNode.insertBefore(link, btn.nextSibling);
    }
  }
}

document.addEventListener('click', e => {
  if (!e.target.closest('.book-search-box')) {
    document.getElementById('bookSearchResults')?.classList.remove('open');
  }
});

function showAddBookForm() { document.getElementById('addBookForm').style.display = 'block'; }

function hideAddBookForm() {
  document.getElementById('addBookForm').style.display = 'none';
  ['newBookTitle', 'newBookAuthor', 'newBookText', 'newBookTopic', 'bookSearchInput'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('bookSearchResults').classList.remove('open');
  document.getElementById('gutenbergFetchBtn').style.display = 'none';
  document.getElementById('gutenbergLink')?.remove();
  selectedBookCoverUrl = '';
  gutenbergTextUrl = null;
}

async function addBook() {
  const title = document.getElementById('newBookTitle').value.trim();
  const author = document.getElementById('newBookAuthor').value.trim();
  const grade = parseInt(document.getElementById('newBookGrade').value);
  const topic = document.getElementById('newBookTopic').value.trim();
  const text = document.getElementById('newBookText').value.trim();
  if (!title || !text) { alert('Please fill in the title and passage text.'); return; }
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('library_books').insert({
    teacher_id: user.id, title, author, grade, topic, text,
    cover_url: selectedBookCoverUrl || null
  });
  if (error) {
    alert('Could not save. Make sure the library_books table exists in Supabase.');
    return;
  }
  hideAddBookForm();
  await loadLibraryAdmin();
}

async function deleteBook(id) {
  if (!confirm('Remove this book from the library?')) return;
  await sb.from('library_books').delete().eq('id', id);
  await loadLibraryAdmin();
}
