import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCompletedLessonIdsForStartingUnit,
  getLessonsForLevel,
  getStartingUnitForScore,
  getUnitsForLevel,
} from "../data/lessons";
import {
  AnswerResult,
  FriendProfile,
  Lesson,
  PlacementResult,
  Progress,
  SessionQuestion,
  SessionState,
} from "../types/quiz";

const STORAGE_KEY = "urdu-lingo-progress";
const MAX_HEARTS = 3;

const defaultProgress: Progress = {
  userName: "Learner",
  playerId: "UA-100271",
  isOnboarded: false,
  goal: null,
  level: null,
  avatar: null,
  lastProfile: null,
  xp: 0,
  hearts: MAX_HEARTS,
  streak: 1,
  lastPracticeDate: null,
  completedLessons: [],
  missedBank: {},
  friends: [],
  placement: null,
};

const levelAvatars: Record<"Beginner" | "Intermediate" | "Advanced", string[]> = {
  Beginner: ["🐱", "🌙", "🐣", "🦊"],
  Intermediate: ["🦉", "🐼", "🐬", "⭐"],
  Advanced: ["🐯", "🦋", "🦚", "✨"],
};

const directoryProfiles: FriendProfile[] = [
  { id: "UA-284193", name: "Sana", avatar: "🐱", xp: 420, streak: 7, location: "New York, USA" },
  { id: "UA-514802", name: "Ayaan", avatar: "🦊", xp: 360, streak: 5, location: "New Jersey, USA" },
  { id: "UA-771204", name: "Mika", avatar: "🐼", xp: 295, streak: 3, location: "Texas, USA" },
  { id: "UA-663518", name: "Hiba", avatar: "🦉", xp: 540, streak: 10, location: "Toronto, Canada" },
];

function createPlayerId(seed: string) {
  const value = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `UA-${String((value * 97) % 900000 + 100000)}`;
}

function normalizeLoadedProgress(parsed: Progress): Progress {
  const merged = {
    ...defaultProgress,
    ...parsed,
  };

  if (!merged.playerId) {
    merged.playerId = createPlayerId(merged.userName || "Learner");
  }

  if (!merged.lastProfile && merged.isOnboarded && merged.goal && merged.level) {
    merged.lastProfile = {
      userName: merged.userName,
      goal: merged.goal,
      level: merged.level,
      avatar: merged.avatar ?? levelAvatars[merged.level][0],
      playerId: merged.playerId,
    };
  }

  if (!merged.avatar && merged.lastProfile?.avatar) {
    merged.avatar = merged.lastProfile.avatar;
  }

  if (!merged.lastProfile?.playerId && merged.lastProfile) {
    merged.lastProfile.playerId = merged.playerId;
  }

  return merged;
}

function pickAvatar(userName: string, level: "Beginner" | "Intermediate" | "Advanced") {
  const options = levelAvatars[level];
  const seed = userName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return options[seed % options.length];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function updateStreak(progress: Progress): Progress {
  const today = new Date().toISOString().slice(0, 10);

  if (!progress.lastPracticeDate) {
    return {
      ...progress,
      streak: 1,
      lastPracticeDate: today,
    };
  }

  const last = new Date(progress.lastPracticeDate);
  const now = new Date(today);
  const diff = Math.round((now.getTime() - last.getTime()) / 86400000);

  if (diff <= 0) {
    return {
      ...progress,
      lastPracticeDate: today,
    };
  }

  return {
    ...progress,
    streak: diff === 1 ? progress.streak + 1 : 1,
    lastPracticeDate: today,
  };
}

function buildLessonQuestions(lesson: Lesson): SessionQuestion[] {
  return shuffle(lesson.questions).map((question) => ({
    ...question,
    choices: question.choices ? shuffle(question.choices) : undefined,
    lessonId: lesson.id,
  }));
}

function buildReviewQuestions(progress: Progress, lessons: Lesson[]): SessionQuestion[] {
  const ranked = Object.entries(progress.missedBank)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 10);

  const questionMap = new Map<string, SessionQuestion>();
  lessons.forEach((lesson) => {
    lesson.questions.forEach((item) => {
      const key = item.id;
      questionMap.set(key, {
        ...item,
        choices: item.choices ? shuffle(item.choices) : undefined,
        lessonId: lesson.id,
      });
    });
  });

  return shuffle(
    ranked
      .map(([key]) => questionMap.get(key))
      .filter((item): item is SessionQuestion => Boolean(item)),
  );
}

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function persistProgress(progress: Progress) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useQuizApp() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const units = useMemo(() => getUnitsForLevel(progress.level), [progress.level]);
  const lessons = useMemo(() => getLessonsForLevel(progress.level), [progress.level]);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Progress;
          const normalized = normalizeLoadedProgress(parsed);
          setProgress(normalized);
          await persistProgress(normalized);
        }
      } finally {
        setIsLoaded(true);
      }
    }

    void load();
  }, []);

  const currentQuestion = useMemo(() => {
    if (!session) {
      return null;
    }
    return session.questions[session.currentIndex] ?? null;
  }, [session]);

  const startLesson = useCallback(async (lessonId: string) => {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) {
      return;
    }

    const updatedProgress = updateStreak({
      ...progress,
      hearts: MAX_HEARTS,
    });

    setProgress(updatedProgress);
    await persistProgress(updatedProgress);
    setFeedback(null);
    setSession({
      mode: "lesson",
      lessonId,
      questions: buildLessonQuestions(lesson),
      currentIndex: 0,
      correctAnswers: 0,
      xpPerCorrect: 10,
      isFinished: false,
    });
  }, [lessons, progress]);

  const startReview = useCallback(async () => {
    const reviewQuestions = buildReviewQuestions(progress, lessons);
    const updatedProgress = updateStreak({
      ...progress,
      hearts: MAX_HEARTS,
    });

    setProgress(updatedProgress);
    await persistProgress(updatedProgress);
    setFeedback(null);
    setSession({
      mode: "review",
      lessonId: null,
      questions: reviewQuestions,
      currentIndex: 0,
      correctAnswers: 0,
      xpPerCorrect: 5,
      isFinished: reviewQuestions.length === 0,
    });
  }, [lessons, progress]);

  const submitAnswer = useCallback(async (choice: string) => {
    if (!session) {
      return;
    }

    const question = session.questions[session.currentIndex];
    if (!question) {
      return;
    }

    const key = question.id;
    const isCorrect = question.type === "buildSentence"
      ? normalizeAnswer(choice) === normalizeAnswer(question.answerUr)
      : choice === question.answerUr;
    const nextProgress: Progress = {
      ...progress,
      xp: progress.xp + (isCorrect ? session.xpPerCorrect : 0),
      hearts: isCorrect ? progress.hearts : Math.max(progress.hearts - 1, 0),
      missedBank: { ...progress.missedBank },
      completedLessons: [...progress.completedLessons],
    };

    if (isCorrect && session.mode === "review" && nextProgress.missedBank[key]) {
      const newMissCount = nextProgress.missedBank[key] - 1;
      if (newMissCount <= 0) {
        delete nextProgress.missedBank[key];
      } else {
        nextProgress.missedBank[key] = newMissCount;
      }
    }

    if (!isCorrect) {
      nextProgress.missedBank[key] = (nextProgress.missedBank[key] ?? 0) + 1;
    }

    const nextIndex = session.currentIndex + 1;
    const correctAnswers = session.correctAnswers + (isCorrect ? 1 : 0);
    const lessonDone = nextIndex >= session.questions.length;
    const heartsDone = nextProgress.hearts <= 0;
    const done = lessonDone || heartsDone;

    if (done && session.mode === "lesson" && session.lessonId && !nextProgress.completedLessons.includes(session.lessonId)) {
      nextProgress.completedLessons.push(session.lessonId);
    }

    const nextSession: SessionState = {
      ...session,
      currentIndex: nextIndex,
      correctAnswers,
      isFinished: done,
    };

    const result: AnswerResult = {
      done,
      wasCorrect: isCorrect,
      message: isCorrect
        ? `Correct! +${session.xpPerCorrect} XP`
        : `Not quite. Correct answer: ${question.answerUr}`,
      tip: question.tip,
      correctAnswer: question.answerUr,
      correct: correctAnswers,
      total: session.questions.length,
      updatedProgress: nextProgress,
    };

    setProgress(nextProgress);
    setSession(nextSession);
    setFeedback(result);
    await persistProgress(nextProgress);
  }, [progress, session]);

  const resetSession = useCallback(() => {
    setSession(null);
    setFeedback(null);
  }, []);

  const saveProfile = useCallback(async ({
    userName,
    goal,
    level,
    avatar,
  }: {
    userName: string;
    goal: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    avatar?: string | null;
  }) => {
    const chosenAvatar = avatar ?? pickAvatar(userName, level);
    const playerId = progress.playerId || createPlayerId(userName);
    const levelChanged = progress.level !== level;
    const nextProgress: Progress = {
      ...progress,
      userName,
      playerId,
      goal,
      level,
      avatar: chosenAvatar,
      isOnboarded: true,
      completedLessons: levelChanged ? [] : progress.completedLessons,
      placement: levelChanged ? null : progress.placement,
      lastProfile: {
        userName,
        goal,
        level,
        avatar: chosenAvatar,
        playerId,
      },
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
  }, [progress]);

  const applyPlacementResult = useCallback(async (score: number, total: number) => {
    const startingUnit = getStartingUnitForScore(score, total);
    const seededLessonIds = getCompletedLessonIdsForStartingUnit(progress.level, startingUnit);
    const placement: PlacementResult = { score, total, startingUnit };
    const seededXp = (startingUnit - 1) * 25;

    const nextProgress: Progress = {
      ...progress,
      placement,
      completedLessons: Array.from(new Set([...progress.completedLessons, ...seededLessonIds])),
      xp: progress.xp + seededXp,
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
    return placement;
  }, [progress]);

  const resetPlacement = useCallback(async () => {
    const nextProgress: Progress = {
      ...progress,
      placement: null,
      completedLessons: [],
    };
    setProgress(nextProgress);
    await persistProgress(nextProgress);
  }, [progress]);

  const startOverProfile = useCallback(async () => {
    const nextProgress: Progress = {
      ...progress,
      userName: "Learner",
      goal: null,
      level: null,
      avatar: null,
      isOnboarded: false,
    };

    setProgress(nextProgress);
    setSession(null);
    setFeedback(null);
    await persistProgress(nextProgress);
  }, [progress]);

  const loginReturningUser = useCallback(async () => {
    if (!progress.lastProfile) {
      return;
    }

    const nextProgress: Progress = {
      ...progress,
      userName: progress.lastProfile.userName,
      playerId: progress.lastProfile.playerId,
      goal: progress.lastProfile.goal,
      level: progress.lastProfile.level,
      avatar: progress.lastProfile.avatar,
      isOnboarded: true,
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
  }, [progress]);

  const addFriendById = useCallback(async (playerId: string) => {
    const normalizedId = playerId.trim().toUpperCase();
    if (!normalizedId) {
      return { ok: false as const, message: "Enter a player ID first." };
    }
    if (normalizedId === progress.playerId) {
      return { ok: false as const, message: "That is your own player ID." };
    }
    if (progress.friends.some((friend) => friend.id === normalizedId)) {
      return { ok: false as const, message: "This player is already in your friends list." };
    }

    const match = directoryProfiles.find((profile) => profile.id === normalizedId);
    if (!match) {
      return { ok: false as const, message: "No player was found with that ID." };
    }

    const nextProgress: Progress = {
      ...progress,
      friends: [...progress.friends, match],
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
    return { ok: true as const, message: `${match.name} was added to your friends.` };
  }, [progress]);

  return {
    units,
    lessons,
    progress,
    session,
    feedback,
    currentQuestion,
    isLoaded,
    hasReviewItems: Object.keys(progress.missedBank).length > 0,
    startLesson,
    startReview,
    submitAnswer,
    resetSession,
    saveProfile,
    startOverProfile,
    loginReturningUser,
    addFriendById,
    applyPlacementResult,
    resetPlacement,
    avatarOptions: levelAvatars,
    playerDirectory: directoryProfiles,
  };
}
