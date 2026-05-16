const CONFIG = {
  AZURE_KEY: "",
  AZURE_REGION: "",
  IBM_PROJECT_ID: "",
  IBM_API_KEY: "",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
