const AZURE_KEY = "";
const AZURE_REGION = "eastus";
const IBM_PROJECT_ID = "";
const IBM_API_KEY = "";
const WX_URL = "";
const MODEL_ID = "";
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

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
