import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
}

interface SurahData {
  data: {
    ayahs: Ayah[];
    name: string;
    englishName: string;
    number: number;
  };
}

interface QuizQuestion {
  question_type: string;
  question_text: string;
  correct_answer: string;
  options: string[];
  ayah_reference: string;
  order: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Split into words preserving diacritics for display
function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

// Normalize for comparison only (strip tashkeel + tatweel)
function normalize(word: string): string {
  return word.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
}

function removeLastWords(text: string, count: number): string {
  const words = getWords(text);
  if (words.length <= count) return "...";
  return words.slice(0, words.length - count).join(" ") + " ...";
}

function pickRandomAyahs(ayahs: Ayah[], count: number): Ayah[] {
  return shuffle(ayahs).slice(0, count);
}

function generateDistractors(correct: string, pool: string[], count: number): string[] {
  const correctNorm = normalize(correct);
  const seen = new Set<string>([correctNorm]);
  const result: string[] = [];
  for (const w of shuffle(pool)) {
    if (result.length >= count) break;
    const wn = normalize(w);
    if (wn === correctNorm || seen.has(wn) || wn.length < 2) continue;
    seen.add(wn);
    result.push(w);
  }
  return result;
}

function generateQuestions(ayahs: Ayah[], difficulty: string, surahName: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let order = 1;

  const wordsPool = ayahs.flatMap(a => getWords(a.text));

  // Question 1: Surah name (always)
  const fakeNames = ["الإسراء", "النحل", "الأعراف", "الرعد", "الشعراء", "النمل", "القصص", "العنكبوت"]
    .filter(n => n !== surahName);
  questions.push({
    question_type: "surah_name",
    question_text: "ما اسم السورة التي تحتوي على هذه الآية؟",
    correct_answer: surahName,
    options: shuffle([surahName, ...shuffle(fakeNames).slice(0, 3)]),
    ayah_reference: `${ayahs[0].numberInSurah}`,
    order: order++,
  });

  // Missing word questions
  const missingCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
  const selectedAyahs = pickRandomAyahs(ayahs, missingCount);

  for (const ayah of selectedAyahs) {
    const words = getWords(ayah.text);
    if (words.length < 3) continue;
    const missingIdx = Math.floor(Math.random() * (words.length - 2)) + 1;
    const missingWord = words[missingIdx];
    const before = words.slice(0, missingIdx).join(" ");
    const after = words.slice(missingIdx + 1).join(" ");

    const distractors = generateDistractors(missingWord, wordsPool, 3);
    if (distractors.length < 3) continue;

    questions.push({
      question_type: "missing_word",
      question_text: `أكمل الآية: ${before} ______ ${after}`,
      correct_answer: missingWord,
      options: shuffle([missingWord, ...distractors]),
      ayah_reference: `${ayah.numberInSurah}`,
      order: order++,
    });
  }

  // Next ayah (medium + hard)
  if (difficulty === "medium" || difficulty === "hard") {
    const nextCount = difficulty === "medium" ? 1 : 2;
    for (let i = 0; i < nextCount; i++) {
      const idx = Math.floor(Math.random() * (ayahs.length - 1));
      const current = ayahs[idx];
      const next = ayahs[idx + 1];
      const fakeNext = pickRandomAyahs(ayahs.filter(a => a.numberInSurah !== next.numberInSurah), 3);

      questions.push({
        question_type: "next_ayah",
        question_text: `ما الآية التي تلي: ${removeLastWords(current.text, 2)}`,
        correct_answer: next.text,
        options: shuffle([next.text, ...fakeNext.map(a => a.text)]),
        ayah_reference: `${current.numberInSurah}`,
        order: order++,
      });
    }
  }

  // Order ayahs (hard only)
  if (difficulty === "hard") {
    const orderCount = 3;
    const orderAyahs = pickRandomAyahs(ayahs, orderCount);
    const sorted = [...orderAyahs].sort((a, b) => a.numberInSurah - b.numberInSurah);
    const correctOrder = sorted.map(a => a.numberInSurah).join("-");
    const shuffled = shuffle(orderAyahs);

    questions.push({
      question_type: "order_ayahs",
      question_text: `رتب هذه الآيات من الأولى إلى الأخيرة: ${shuffled.map(a => `"${removeLastWords(a.text, 2)}"`).join(" - ")}`,
      correct_answer: correctOrder,
      options: shuffle([
        correctOrder,
        shuffle(sorted).map(a => a.numberInSurah).join("-"),
        shuffle(sorted).map(a => a.numberInSurah).join("-"),
        shuffle(sorted).map(a => a.numberInSurah).join("-"),
      ]),
      ayah_reference: shuffled.map(a => a.numberInSurah).join(","),
      order: order++,
    });
  }

  return questions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { surah_number, difficulty } = await req.json();
    if (!surah_number || !difficulty) {
      return new Response(JSON.stringify({ error: "Missing surah_number or difficulty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ayahs from Quran.com API
    const apiRes = await fetch(`https://api.alquran.cloud/v1/surah/${surah_number}`);
    if (!apiRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch surah" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiData = await apiRes.json() as SurahData;
    const ayahs = apiData.data.ayahs;
    const surahName = apiData.data.name;

    const questions = generateQuestions(ayahs, difficulty, surahName);

    return new Response(JSON.stringify({
      surah_name: surahName,
      surah_number: apiData.data.number,
      questions,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
