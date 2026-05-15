export type QuestionType =
  | "translateToUrdu"
  | "translateToEnglish"
  | "listenMeaning"
  | "buildSentence";

export type Phrase = {
  english: string;
  transliteration: string;
  urduText: string;
  tip: string;
};

export type LessonQuestion = {
  id: string;
  type: QuestionType;
  promptEn: string;
  promptRoman: string;
  promptUrdu: string;
  answerUr: string;
  choices?: string[];
  wordBank?: string[];
  tip: string;
  audioText: string;
  helperText: string;
};

export type Lesson = {
  id: string;
  unitId: string;
  order: number;
  title: string;
  description: string;
  accent: string;
  phrases: Phrase[];
  questions: LessonQuestion[];
};

export type Unit = {
  id: string;
  order: number;
  title: string;
  description: string;
  accent: string;
  lessons: Lesson[];
};

export type FriendProfile = {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  streak: number;
  location: string;
};

export type PlacementResult = {
  score: number;
  total: number;
  startingUnit: number;
};

export type Progress = {
  userName: string;
  playerId: string;
  isOnboarded: boolean;
  goal: string | null;
  level: "Beginner" | "Intermediate" | "Advanced" | null;
  avatar: string | null;
  lastProfile: {
    userName: string;
    goal: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    avatar: string;
    playerId: string;
  } | null;
  xp: number;
  hearts: number;
  streak: number;
  lastPracticeDate: string | null;
  completedLessons: string[];
  missedBank: Record<string, number>;
  friends: FriendProfile[];
  placement: PlacementResult | null;
};

export type SessionMode = "lesson" | "review";

export type SessionQuestion = LessonQuestion & {
  lessonId: string;
};

export type SessionState = {
  mode: SessionMode;
  lessonId: string | null;
  questions: SessionQuestion[];
  currentIndex: number;
  correctAnswers: number;
  xpPerCorrect: number;
  isFinished: boolean;
};

export type AnswerResult = {
  done: boolean;
  wasCorrect: boolean;
  message: string;
  tip: string;
  correctAnswer: string;
  correct: number;
  total: number;
  updatedProgress: Progress;
};
