import { Lesson, LessonQuestion, Phrase, Unit } from "../types/quiz";
import { romanToUrdu } from "../utils/urdu";

type PhraseTuple = [string, string, string];
type Pack = {
  title: string;
  description: string;
  phrases: PhraseTuple[];
};

const PACKS: Record<string, Pack> = {
  greetings: { title: "Greetings", description: "Warm everyday greetings.", phrases: [
    ["Hello", "Assalamualaikum", "A warm greeting."],
    ["How are you?", "Aap kaise hain?", "A polite check-in."],
    ["I am fine", "Main theek hoon", "A basic reply."],
    ["Thank you", "Shukriya", "A common thank-you."],
    ["See you later", "Phir milte hain", "A friendly goodbye."],
  ]},
  intro: { title: "Introductions", description: "Names and identity basics.", phrases: [
    ["My name is Ali", "Mera naam Ali hai", "Mera naam means my name."],
    ["What is your name?", "Aap ka naam kya hai?", "A polite question."],
    ["I am learning Urdu", "Main Urdu seekh rahi hoon", "Use for study talk."],
    ["I am from New York", "Main New York se hoon", "Se means from."],
    ["Nice to meet you", "Aap se mil kar khushi hui", "A respectful phrase."],
  ]},
  manners: { title: "Polite Phrases", description: "Respectful everyday language.", phrases: [
    ["Please", "Meherbani", "A polite softener."],
    ["Sorry", "Maaf kijiye", "A respectful apology."],
    ["Excuse me", "Suniye", "Useful for attention."],
    ["You are welcome", "Koi baat nahin", "A calm reply."],
    ["Please help me", "Meri madad kijiye", "A useful request."],
  ]},
  family: { title: "Family", description: "Core family words.", phrases: [
    ["Mother", "Ammi", "Also heard as maa."],
    ["Father", "Abbu", "A warm word for dad."],
    ["Brother", "Bhai", "A common family term."],
    ["Sister", "Behen", "A common family term."],
    ["My family is big", "Meri family bari hai", "Bari means big."],
  ]},
  home: { title: "Home", description: "Rooms and home life.", phrases: [
    ["Kitchen", "Bawarchi khana", "Kitchen area."],
    ["Bedroom", "Sone ka kamra", "Room for sleeping."],
    ["The door is open", "Darwaza khula hai", "Khula means open."],
    ["Close the window", "Khirki band karo", "A home instruction."],
    ["We are at home", "Hum ghar par hain", "Ghar means home."],
  ]},
  needs: { title: "Daily Needs", description: "Express simple needs.", phrases: [
    ["I need water", "Mujhe pani chahiye", "Pani means water."],
    ["I am hungry", "Mujhe bhook lagi hai", "Bhook means hunger."],
    ["I am thirsty", "Mujhe pyaas lagi hai", "Pyaas means thirst."],
    ["I am tired", "Main thak gaya hoon", "A common feeling."],
    ["I need rest", "Mujhe aaram chahiye", "Aaram means rest."],
  ]},
  food: { title: "Food", description: "Basic meals and drinks.", phrases: [
    ["Bread", "Roti", "A staple food."],
    ["Rice", "Chawal", "A common dish base."],
    ["Tea", "Chai", "A very useful word."],
    ["I want tea", "Mujhe chai chahiye", "A simple request."],
    ["The food is delicious", "Khana lazeez hai", "Lazeez means delicious."],
  ]},
  shopping: { title: "Shopping", description: "Useful market phrases.", phrases: [
    ["How much is this?", "Yeh kitne ka hai?", "A key shopping question."],
    ["It is expensive", "Yeh mehnga hai", "Mehnga means expensive."],
    ["It is cheap", "Yeh sasta hai", "Sasta means cheap."],
    ["I want two", "Mujhe do chahiye", "Do means two."],
    ["Please pack this", "Isay pack kar dein", "A checkout request."],
  ]},
  directions: { title: "Directions", description: "Find your way around.", phrases: [
    ["Where is the station?", "Station kahan hai?", "A location question."],
    ["It is nearby", "Yeh qareeb hai", "Qareeb means near."],
    ["Go straight", "Seedha jaiye", "Seedha means straight."],
    ["Turn left", "Baen mur jaiye", "Baen means left."],
    ["I am lost", "Main raasta bhool gaya hoon", "A useful travel phrase."],
  ]},
  travel: { title: "Travel", description: "Moving between places.", phrases: [
    ["Passport", "Passport", "Travel essential."],
    ["Ticket", "Ticket", "Travel essential."],
    ["I have a reservation", "Meri booking hai", "A hotel phrase."],
    ["My flight is late", "Meri flight der se hai", "Der means late."],
    ["I need a taxi", "Mujhe taxi chahiye", "A transport request."],
  ]},
  school: { title: "School", description: "Classroom language.", phrases: [
    ["Book", "Kitaab", "A study word."],
    ["Write this", "Yeh likho", "Likho means write."],
    ["Read aloud", "Buland awaaz se parho", "Parho means read."],
    ["I have a question", "Mera ek sawal hai", "Sawal means question."],
    ["Urdu is my favorite subject", "Urdu mera pasandeeda mazmoon hai", "Pasandeeda means favorite."],
  ]},
  work: { title: "Work", description: "Office and teamwork phrases.", phrases: [
    ["I work in an office", "Main daftar mein kaam karti hoon", "Daftar means office."],
    ["I have a meeting", "Meri meeting hai", "A work phrase."],
    ["Please send the file", "File bhej dijiye", "Bhejna means send."],
    ["Let's work together", "Chaliye saath kaam karte hain", "Saath means together."],
    ["I am free after lunch", "Main lunch ke baad farigh hoon", "Farigh means free."],
  ]},
  feelings: { title: "Feelings", description: "Basic emotions and reactions.", phrases: [
    ["Happy", "Khush", "A simple feeling word."],
    ["Sad", "Udaas", "A simple feeling word."],
    ["I am worried", "Main fikr mein hoon", "Fikr means worry."],
    ["Do not worry", "Fikr mat karein", "A comforting line."],
    ["Everything will be okay", "Sab theek ho jayega", "A reassuring phrase."],
  ]},
  health: { title: "Health", description: "Talk about symptoms and care.", phrases: [
    ["I need a doctor", "Mujhe doctor chahiye", "A clinic phrase."],
    ["I have a fever", "Mujhe bukhar hai", "Bukhar means fever."],
    ["I have pain", "Mujhe dard hai", "Dard means pain."],
    ["I need medicine", "Mujhe dawa chahiye", "Dawa means medicine."],
    ["Please hurry", "Jaldi kijiye", "Useful in urgent situations."],
  ]},
  community: { title: "Community", description: "Neighbors and guests.", phrases: [
    ["Neighbor", "Hamsaya", "A community word."],
    ["Please sit", "Baithiye", "A respectful invitation."],
    ["Have some tea", "Chai lijiye", "A hospitality phrase."],
    ["Welcome to our home", "Hamare ghar mein khush amdeed", "Khush amdeed means welcome."],
    ["Visit again", "Dobara aaiye", "A warm goodbye."],
  ]},
  time: { title: "Time", description: "Schedules and clock talk.", phrases: [
    ["What time is it?", "Kitne baje hain?", "The standard time question."],
    ["Today", "Aaj", "A key day word."],
    ["Tomorrow", "Kal", "Context matters."],
    ["Always", "Hamesha", "A frequency word."],
    ["Please remind me", "Mujhe yaad dila dijiye", "A planning phrase."],
  ]},
  weather: { title: "Weather", description: "Talk about daily conditions.", phrases: [
    ["It is hot", "Garmi hai", "Garmi means heat."],
    ["It is cold", "Sardi hai", "Sardi means cold."],
    ["It is raining", "Barish ho rahi hai", "Barish means rain."],
    ["Take an umbrella", "Chhatri le jao", "Chhatri means umbrella."],
    ["The weather is nice", "Mausam acha hai", "Mausam means weather."],
  ]},
  smalltalk: { title: "Small Talk", description: "Keep conversations moving.", phrases: [
    ["How is your day going?", "Aap ka din kaisa ja raha hai?", "A friendly opener."],
    ["What are you doing?", "Aap kya kar rahe hain?", "A common conversation question."],
    ["I am just relaxing", "Main bas aaram kar rahi hoon", "A casual answer."],
    ["What do you like to do?", "Aap ko kya karna pasand hai?", "Ask about hobbies."],
    ["Talk to you later", "Baad mein baat karte hain", "A natural goodbye."],
  ]},
  reading: { title: "Reading And Writing", description: "Grow literacy and clarity.", phrases: [
    ["I am reading a story", "Main kahani parh rahi hoon", "Kahani means story."],
    ["Write your name", "Apna naam likhiye", "A classic prompt."],
    ["Please say it again", "Dobara boliye", "Useful while learning."],
    ["What does this mean?", "Is ka kya matlab hai?", "Matlab means meaning."],
    ["I can read better now", "Main ab behtar parh sakti hoon", "A progress line."],
  ]},
  culture: { title: "Culture And Courtesy", description: "Respectful social language.", phrases: [
    ["Please come in", "Andar tashreef layein", "A formal welcome."],
    ["Congratulations", "Mubarak ho", "A common congratulatory phrase."],
    ["Happy Eid", "Eid mubarak", "A festive greeting."],
    ["Thank you for coming", "Aane ka shukriya", "A gracious host line."],
    ["It was an honor", "Yeh mere liye izzat ki baat thi", "A formal appreciative line."],
  ]},
  opinions: { title: "Opinions", description: "Share what you think.", phrases: [
    ["I think this is good", "Mujhe lagta hai yeh acha hai", "Lagta hai means I think."],
    ["I agree", "Main mutafiq hoon", "A direct agreement phrase."],
    ["I do not agree", "Main mutafiq nahin hoon", "A respectful disagreement."],
    ["Because it is practical", "Kyunkay yeh amli hai", "Amli means practical."],
    ["It depends", "Yeh halaat par munhasir hai", "A balanced reply."],
  ]},
  story: { title: "Storytelling", description: "Talk about events and memories.", phrases: [
    ["I went to the market", "Main bazaar gayi thi", "A past-tense sentence."],
    ["When I was young", "Jab main chhoti thi", "A story opener."],
    ["Then", "Phir", "A sequence word."],
    ["I remember that day", "Mujhe woh din yaad hai", "A memory phrase."],
    ["In the end I succeeded", "Aakhir mein main kamyab hui", "A meaningful ending."],
  ]},
  tech: { title: "Technology", description: "Apps, phones, and online life.", phrases: [
    ["Phone", "Phone", "Used directly."],
    ["Send me a message", "Mujhe message bhejo", "Bhejo means send."],
    ["Open the app", "App kholo", "A modern command."],
    ["I cannot hear you", "Main aap ko sun nahin sakti", "Useful online."],
    ["My battery is low", "Meri battery kam hai", "A common phone issue."],
  ]},
  fluency: { title: "Fluency Builder", description: "Stretch toward fuller expression.", phrases: [
    ["We should leave now", "Humein ab nikalna chahiye", "A suggestion phrase."],
    ["Let me explain", "Mujhe wazahat karne dein", "Wazahat means explain."],
    ["I can explain this", "Main yeh samjha sakti hoon", "A confidence phrase."],
    ["Practice gives confidence", "Mashq se aitemad aata hai", "Aitemad means confidence."],
    ["I want to keep growing", "Main mazeed behtar hona chahti hoon", "A strong growth line."],
  ]},
};

type Level = "Beginner" | "Intermediate" | "Advanced";
type UnitSpec = readonly [string, string, string, readonly string[]];

const BEGINNER_UNIT_SPECS: readonly UnitSpec[] = [
  ["Foundations", "Build the first phrases of Urdu.", "#38b000", ["greetings", "intro", "manners", "needs", "smalltalk"]],
  ["Family And Home", "Talk about family and life at home.", "#2d6a4f", ["family", "home", "community", "needs", "greetings"]],
  ["Daily Basics", "Handle everyday routines more smoothly.", "#40916c", ["needs", "food", "time", "weather", "smalltalk"]],
  ["Food And Market", "Order, shop, and ask for what you need.", "#f77f00", ["food", "shopping", "manners", "community", "needs"]],
  ["Getting Around", "Travel, directions, and public movement.", "#277da1", ["directions", "travel", "time", "community", "smalltalk"]],
  ["Learning Mode", "Study and build stronger learning habits.", "#4d908e", ["school", "reading", "intro", "smalltalk", "fluency"]],
  ["Work Life", "Professional phrases and teamwork.", "#7f5539", ["work", "smalltalk", "opinions", "time", "fluency"]],
  ["Feelings And Support", "Describe emotions and offer comfort.", "#bc4749", ["feelings", "health", "community", "smalltalk", "fluency"]],
  ["Health And Care", "Talk through symptoms and care needs.", "#e63946", ["health", "manners", "community", "needs", "time"]],
  ["Weather And Time", "Plan around time and daily conditions.", "#219ebc", ["time", "weather", "travel", "smalltalk", "fluency"]],
  ["Culture", "Respectful language for shared spaces and celebrations.", "#6d597a", ["culture", "community", "manners", "family", "smalltalk"]],
  ["Opinions", "Share what you think with more confidence.", "#9d4edd", ["opinions", "feelings", "smalltalk", "story", "fluency"]],
  ["Stories", "Tell stories about the past and your memories.", "#5a189a", ["story", "family", "time", "feelings", "reading"]],
  ["Technology", "Use Urdu around phones, apps, and online learning.", "#264653", ["tech", "reading", "work", "school", "smalltalk"]],
  ["Reading Growth", "Strengthen literacy and comprehension.", "#8338ec", ["reading", "school", "story", "opinions", "fluency"]],
  ["Travel Confidence", "Use Urdu more confidently while moving around.", "#577590", ["travel", "directions", "shopping", "food", "community"]],
  ["Conversation Builder", "Practice fuller conversations in Urdu.", "#3a86ff", ["smalltalk", "opinions", "feelings", "family", "fluency"]],
  ["Current Speaker Growth", "Expand everyday vocabulary and expression.", "#06d6a0", ["culture", "opinions", "story", "reading", "fluency"]],
  ["Listening Review", "Review with more meaning and audio focus.", "#4361ee", ["greetings", "needs", "directions", "smalltalk", "tech"]],
  ["Urdu Aura Finish", "Bring your new skills together.", "#ff006e", ["fluency", "story", "culture", "reading", "smalltalk"]],
] as const;

const INTERMEDIATE_PACK_OVERRIDES: Partial<Record<string, string>> = {
  greetings: "smalltalk",
  intro: "reading",
  manners: "culture",
  needs: "opinions",
  family: "story",
  home: "community",
  shopping: "work",
  school: "reading",
  feelings: "opinions",
  time: "story",
};

const ADVANCED_PACK_OVERRIDES: Partial<Record<string, string>> = {
  greetings: "fluency",
  intro: "opinions",
  manners: "culture",
  needs: "work",
  family: "story",
  home: "reading",
  food: "culture",
  shopping: "tech",
  directions: "travel",
  school: "reading",
  work: "tech",
  feelings: "opinions",
  health: "fluency",
  time: "story",
  weather: "travel",
  smalltalk: "fluency",
};

function remapPackKeys(packKeys: readonly string[], overrides: Partial<Record<string, string>>) {
  return packKeys.map((key) => overrides[key] ?? key);
}

function getUnitSpecsForLevel(level: Level | null): readonly UnitSpec[] {
  if (level === "Intermediate") {
    return BEGINNER_UNIT_SPECS.map(([title, description, accent, packKeys]) => [
      title,
      `${description} Intermediate path: faster conversation and comprehension growth.`,
      accent,
      remapPackKeys(packKeys, INTERMEDIATE_PACK_OVERRIDES),
    ] as const);
  }

  if (level === "Advanced") {
    return BEGINNER_UNIT_SPECS.map(([title, description, accent, packKeys]) => [
      title,
      `${description} Advanced path: richer fluency, nuance, and expression.`,
      accent,
      remapPackKeys(packKeys, ADVANCED_PACK_OVERRIDES),
    ] as const);
  }

  return BEGINNER_UNIT_SPECS;
}

function phrase(english: string, transliteration: string, tip: string): Phrase {
  return {
    english,
    transliteration,
    urduText: romanToUrdu(transliteration),
    tip,
  };
}

function buildChoices(correct: string, pool: string[]) {
  return [correct, ...pool.filter((item) => item !== correct)].slice(0, 4);
}

function buildWordBank(correct: string, pool: string[]) {
  const correctWords = correct.split(" ");
  const distractors = pool
    .filter((item) => item !== correct)
    .flatMap((item) => item.split(" "))
    .filter((word) => !correctWords.includes(word))
    .slice(0, 2);

  return [...correctWords, ...distractors].sort(() => Math.random() - 0.5);
}

function buildQuestions(lessonId: string, phrases: Phrase[]): LessonQuestion[] {
  const [a, b, c, d, e] = phrases;
  const englishPool = phrases.map((item) => item.english);
  const urduPool = phrases.map((item) => item.transliteration);

  return [
    { id: `${lessonId}-q1`, type: "translateToUrdu", promptEn: `How do you say "${a.english}"?`, promptRoman: `Aap "${a.english}" ko Roman Urdu mein kaise kehte hain?`, promptUrdu: `آپ "${a.english}" کو رومن اردو میں کیسے کہتے ہیں؟`, answerUr: a.transliteration, choices: buildChoices(a.transliteration, urduPool), tip: a.tip, audioText: a.transliteration, helperText: "Choose the correct Urdu transliteration." },
    { id: `${lessonId}-q2`, type: "translateToEnglish", promptEn: `What does "${b.transliteration}" mean?`, promptRoman: `"${b.transliteration}" ka matlab kya hai?`, promptUrdu: `"${b.urduText}" کا مطلب کیا ہے؟`, answerUr: b.english, choices: buildChoices(b.english, englishPool), tip: b.tip, audioText: b.transliteration, helperText: "A few questions ask what is being asked in English." },
    { id: `${lessonId}-q3`, type: "listenMeaning", promptEn: "Tap play. What are you hearing?", promptRoman: "Audio suniye. Aap kya sun rahe hain?", promptUrdu: "آڈیو سنیے۔ آپ کیا سن رہے ہیں؟", answerUr: c.english, choices: buildChoices(c.english, englishPool), tip: c.tip, audioText: c.transliteration, helperText: "Listen and choose the meaning." },
    { id: `${lessonId}-q4`, type: "translateToUrdu", promptEn: `How do you say "${d.english}"?`, promptRoman: `Roman Urdu mein "${d.english}" kaise kahenge?`, promptUrdu: `رومن اردو میں "${d.english}" کیسے کہیں گے؟`, answerUr: d.transliteration, choices: buildChoices(d.transliteration, urduPool), tip: d.tip, audioText: d.transliteration, helperText: "Match the English meaning with the Urdu phrase." },
    { id: `${lessonId}-q5`, type: "buildSentence", promptEn: `Build this sentence: "${e.english}"`, promptRoman: `Yeh jumla banaiye: "${e.transliteration}"`, promptUrdu: `یہ جملہ بنائیے: "${e.urduText}"`, answerUr: e.transliteration, wordBank: buildWordBank(e.transliteration, urduPool), tip: `${e.tip} Put the words in the right order to build the sentence.`, audioText: e.transliteration, helperText: "Tap the word tiles to build the full Roman Urdu sentence." },
  ];
}

function buildUnits(level: Level | null): Unit[] {
  return getUnitSpecsForLevel(level).map(([title, description, accent, packKeys], unitIndex) => {
  const lessons: Lesson[] = packKeys.map((packKey, lessonIndex) => {
    const pack = PACKS[packKey];
    const lessonId = `unit-${unitIndex + 1}-lesson-${lessonIndex + 1}`;
    const phrases = pack.phrases.map(([english, transliteration, tip]) => phrase(english, transliteration, tip));

    return {
      id: lessonId,
      unitId: `unit-${unitIndex + 1}`,
      order: lessonIndex + 1,
      title: pack.title,
      description: `${pack.description} Lesson ${lessonIndex + 1} ends with a quiz checkpoint.`,
      accent,
      phrases,
      questions: buildQuestions(lessonId, phrases),
    };
  });

  return {
    id: `unit-${unitIndex + 1}`,
    order: unitIndex + 1,
    title,
    description,
    accent,
    lessons,
  };
});
}

export function getUnitsForLevel(level: Level | null): Unit[] {
  return buildUnits(level);
}

export function getLessonsForLevel(level: Level | null): Lesson[] {
  return getUnitsForLevel(level).flatMap((unit) => unit.lessons);
}

export const UNITS: Unit[] = getUnitsForLevel("Beginner");
export const LESSONS: Lesson[] = getLessonsForLevel("Beginner");

export const PLACEMENT_QUESTION_COUNT = 10;

// Each placement entry pins one distinct pack + one of its phrases + the
// question type to ask. This guarantees no pack repeats in the 10-question
// run (the previous implementation kept landing on "time" 3x because units
// 4, 6, and 8 all include the time pack at the modulo positions we hit).
type PlacementSpec = {
  pack: string;
  type: Exclude<LessonQuestion["type"], "buildSentence">;
  phraseIndex: number;
};

const BEGINNER_PLACEMENT_SPECS: PlacementSpec[] = [
  { pack: "greetings", type: "translateToUrdu", phraseIndex: 0 },
  { pack: "family", type: "translateToEnglish", phraseIndex: 0 },
  { pack: "food", type: "listenMeaning", phraseIndex: 2 },
  { pack: "needs", type: "translateToUrdu", phraseIndex: 0 },
  { pack: "directions", type: "translateToEnglish", phraseIndex: 1 },
  { pack: "time", type: "listenMeaning", phraseIndex: 0 },
  { pack: "weather", type: "translateToUrdu", phraseIndex: 2 },
  { pack: "shopping", type: "translateToEnglish", phraseIndex: 0 },
  { pack: "work", type: "listenMeaning", phraseIndex: 1 },
  { pack: "culture", type: "translateToUrdu", phraseIndex: 0 },
];

function levelPackOverrides(level: Level | null): Partial<Record<string, string>> {
  if (level === "Intermediate") return INTERMEDIATE_PACK_OVERRIDES;
  if (level === "Advanced") return ADVANCED_PACK_OVERRIDES;
  return {};
}

function buildPlacementQuestion(spec: PlacementSpec, pack: Pack, idIndex: number): LessonQuestion | null {
  const phrases = pack.phrases.map(([english, transliteration, tip]) => phrase(english, transliteration, tip));
  const target = phrases[spec.phraseIndex] ?? phrases[0];
  if (!target) return null;
  const englishPool = phrases.map((item) => item.english);
  const urduPool = phrases.map((item) => item.transliteration);
  const idPrefix = `placement-${idIndex}-${spec.pack}`;

  switch (spec.type) {
    case "translateToUrdu":
      return {
        id: `${idPrefix}-tu`,
        type: "translateToUrdu",
        promptEn: `How do you say "${target.english}"?`,
        promptRoman: `Aap "${target.english}" ko Roman Urdu mein kaise kehte hain?`,
        promptUrdu: `آپ "${target.english}" کو رومن اردو میں کیسے کہتے ہیں؟`,
        answerUr: target.transliteration,
        choices: buildChoices(target.transliteration, urduPool),
        tip: target.tip,
        audioText: target.transliteration,
        helperText: "Choose the correct Urdu phrase.",
      };
    case "translateToEnglish":
      return {
        id: `${idPrefix}-te`,
        type: "translateToEnglish",
        promptEn: `What does "${target.transliteration}" mean?`,
        promptRoman: `"${target.transliteration}" ka matlab kya hai?`,
        promptUrdu: `"${target.urduText}" کا مطلب کیا ہے؟`,
        answerUr: target.english,
        choices: buildChoices(target.english, englishPool),
        tip: target.tip,
        audioText: target.transliteration,
        helperText: "Pick the English meaning.",
      };
    case "listenMeaning":
      return {
        id: `${idPrefix}-lm`,
        type: "listenMeaning",
        promptEn: "Tap play. What are you hearing?",
        promptRoman: "Audio suniye. Aap kya sun rahe hain?",
        promptUrdu: "آڈیو سنیے۔ آپ کیا سن رہے ہیں؟",
        answerUr: target.english,
        choices: buildChoices(target.english, englishPool),
        tip: target.tip,
        audioText: target.transliteration,
        helperText: "Listen and choose the meaning.",
      };
  }
}

export function getPlacementQuestions(level: Level | null): LessonQuestion[] {
  const overrides = levelPackOverrides(level);
  const seenPacks = new Set<string>();
  const out: LessonQuestion[] = [];
  BEGINNER_PLACEMENT_SPECS.forEach((spec, index) => {
    const packKey = overrides[spec.pack] ?? spec.pack;
    if (seenPacks.has(packKey)) return; // de-dupe in case overrides collide
    const pack = PACKS[packKey];
    if (!pack) return;
    seenPacks.add(packKey);
    const built = buildPlacementQuestion({ ...spec, pack: packKey }, pack, index);
    if (built) out.push(built);
  });
  return out;
}

export function getStartingUnitForScore(score: number, total: number): number {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.9) return 12;
  if (ratio >= 0.7) return 8;
  if (ratio >= 0.4) return 4;
  return 1;
}

export function getCompletedLessonIdsForStartingUnit(level: Level | null, startingUnit: number): string[] {
  if (startingUnit <= 1) return [];
  const units = getUnitsForLevel(level);
  return units
    .slice(0, startingUnit - 1)
    .flatMap((unit) => unit.lessons.map((lesson) => lesson.id));
}


