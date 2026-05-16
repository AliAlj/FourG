const AZURE_KEY = CONFIG.AZURE_KEY;
const AZURE_REGION = CONFIG.AZURE_REGION;
const IBM_API_KEY = CONFIG.IBM_API_KEY;
const IBM_PROJECT_ID = CONFIG.IBM_PROJECT_ID;

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let sessionRestored = false;
let currentStudent = {};
let currentClassCode = '';
let currentClassName = '';
let currentPassageIndex = 0;
let recognizer;
let isRecording = false;
let lastFeedback = '';
let currentModalWord = '';
let allSessions = [];
let teacherClasses = [];
let wordDataCache = {};
let currentBook = null;
let libraryBooks = [];
let currentLibraryFilter = null;
let selectedBookCoverUrl = '';
let bookSearchTimeout = null;
let gutenbergTextUrl = null;
let currentAssignments = [];
const GOOGLE_AI_KEY = CONFIG.GOOGLE_AI_KEY;
const GOOGLE_TTS_KEY = CONFIG.GOOGLE_TTS_KEY;
const GROQ_API_KEY = CONFIG.GROQ_API_KEY;
