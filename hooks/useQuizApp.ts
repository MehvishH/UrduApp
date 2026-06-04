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
  DailyXpGoal,
  FriendProfile,
  Lesson,
  PlacementResult,
  Progress,
  SessionQuestion,
  SessionState,
} from "../types/quiz";

const STORAGE_KEY = "urdu-lingo-progress";
const MAX_HEARTS = 5;
const HEART_REGEN_MS = 20 * 60 * 1000; // 20 minutes per heart

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  nextHeartAt: null,
  streak: 1,
  lastPracticeDate: null,
  completedLessons: [],
  missedBank: {},
  friends: [],
  placement: null,
  dailyXpGoal: 20,
  dailyXp: { date: todayKey(), earned: 0 },
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
      dailyXpGoal: merged.dailyXpGoal ?? 20,
    };
  }

  if (!merged.avatar && merged.lastProfile?.avatar) {
    merged.avatar = merged.lastProfile.avatar;
  }

  if (merged.lastProfile && !merged.lastProfile.playerId) {
    merged.lastProfile.playerId = merged.playerId;
  }

  if (merged.lastProfile && !merged.lastProfile.dailyXpGoal) {
    merged.lastProfile.dailyXpGoal = merged.dailyXpGoal ?? 20;
  }

  // Guard against persisted snapshots from before these fields existed.
  if (merged.hearts === undefined || merged.hearts === null) {
    merged.hearts = MAX_HEARTS;
  }
  if (merged.hearts > MAX_HEARTS) {
    merged.hearts = MAX_HEARTS;
  }
  if (!merged.dailyXp || typeof merged.dailyXp !== "object") {
    merged.dailyXp = { date: todayKey(), earned: 0 };
  }
  if (!merged.dailyXpGoal) {
    merged.dailyXpGoal = 20;
  }

  return applyHeartRegen(rollDailyXp(merged));
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
  const today = todayKey();

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

function applyHeartRegen(progress: Progress): Progress {
  if (progress.hearts >= MAX_HEARTS || !progress.nextHeartAt) {
    return { ...progress, nextHeartAt: progress.hearts >= MAX_HEARTS ? null : progress.nextHeartAt };
  }

  const now = Date.now();
  const target = new Date(progress.nextHeartAt).getTime();
  if (Number.isNaN(target) || now < target) {
    return progress;
  }

  let hearts = progress.hearts;
  let cursor = target;
  while (hearts < MAX_HEARTS && cursor <= now) {
    hearts += 1;
    cursor += HEART_REGEN_MS;
  }

  return {
    ...progress,
    hearts,
    nextHeartAt: hearts >= MAX_HEARTS ? null : new Date(cursor).toISOString(),
  };
}

function rollDailyXp(progress: Progress): Progress {
  const today = todayKey();
  if (progress.dailyXp?.date === today) {
    return progress;
  }
  return {
    ...progress,
    dailyXp: { date: today, earned: 0 },
  };
}

function noteHeartLost(progress: Progress): Progress {
  if (progress.nextHeartAt) {
    return progress;
  }
  return {
    ...progress,
    nextHeartAt: new Date(Date.now() + HEART_REGEN_MS).toISOString(),
  };
}

function addDailyXp(progress: Progress, amount: number): Progress {
  if (amount <= 0) return progress;
  const today = todayKey();
  if (progress.dailyXp?.date !== today) {
    return {
      ...progress,
      dailyXp: { date: today, earned: amount },
    };
  }
  return {
    ...progress,
    dailyXp: { date: today, earned: progress.dailyXp.earned + amount },
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
  const [, forceTick] = useState(0);
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

  // Tick once a minute so heart-regen countdowns + dailyXp date-rollover update.
  useEffect(() => {
    const interval = setInterval(() => {
      forceTick((value) => value + 1);
      setProgress((current) => {
        const next = applyHeartRegen(rollDailyXp(current));
        if (next === current) return current;
        void persistProgress(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
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
      return false;
    }
    const regenerated = applyHeartRegen(rollDailyXp(progress));
    if (regenerated.hearts <= 0) {
      setProgress(regenerated);
      await persistProgress(regenerated);
      return false;
    }

    const updatedProgress = updateStreak(regenerated);

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
    return true;
  }, [lessons, progress]);

  const startReview = useCallback(async () => {
    const regenerated = applyHeartRegen(rollDailyXp(progress));
    const reviewQuestions = buildReviewQuestions(regenerated, lessons);
    if (regenerated.hearts <= 0 && reviewQuestions.length > 0) {
      setProgress(regenerated);
      await persistProgress(regenerated);
      return false;
    }
    const updatedProgress = updateStreak(regenerated);

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
    return true;
  }, [lessons, progress]);

  const submitAnswer = useCallback(async (choice: string) => {
    if (!session) {
      return;
    }
    if (feedback) {
      return; // already graded; user needs to advanceSession() first
    }

    const question = session.questions[session.currentIndex];
    if (!question) {
      return;
    }

    const key = question.id;
    const isCorrect = question.type === "buildSentence"
      ? normalizeAnswer(choice) === normalizeAnswer(question.answerUr)
      : choice === question.answerUr;

    let nextProgress: Progress = {
      ...progress,
      xp: progress.xp + (isCorrect ? session.xpPerCorrect : 0),
      hearts: isCorrect ? progress.hearts : Math.max(progress.hearts - 1, 0),
      missedBank: { ...progress.missedBank },
      completedLessons: [...progress.completedLessons],
    };

    if (isCorrect) {
      nextProgress = addDailyXp(nextProgress, session.xpPerCorrect);
    } else {
      nextProgress = noteHeartLost(nextProgress);
    }

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

    const isLastQuestion = session.currentIndex + 1 >= session.questions.length;
    const heartsDone = nextProgress.hearts <= 0;
    const done = isLastQuestion || heartsDone;
    const correctAnswers = session.correctAnswers + (isCorrect ? 1 : 0);

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

    // Update the running tally on the session, but keep currentIndex pinned
    // so the just-answered question stays visible while feedback is shown.
    const updatedSession: SessionState = {
      ...session,
      correctAnswers,
    };

    setProgress(nextProgress);
    setSession(updatedSession);
    setFeedback(result);
    await persistProgress(nextProgress);
  }, [progress, session, feedback]);

  const advanceSession = useCallback(async () => {
    if (!session || !feedback) return;

    if (feedback.done) {
      // Finalize the session — mark lesson complete, flip isFinished, then
      // the UI will swap to the completion card.
      const nextProgress: Progress = {
        ...progress,
        completedLessons: [...progress.completedLessons],
      };
      if (session.mode === "lesson" && session.lessonId && !nextProgress.completedLessons.includes(session.lessonId)) {
        nextProgress.completedLessons.push(session.lessonId);
        setProgress(nextProgress);
        await persistProgress(nextProgress);
      }
      setSession({ ...session, isFinished: true });
      setFeedback(null);
      return;
    }

    setSession({
      ...session,
      currentIndex: session.currentIndex + 1,
    });
    setFeedback(null);
  }, [session, feedback, progress]);

  const resetSession = useCallback(() => {
    setSession(null);
    setFeedback(null);
  }, []);

  const saveProfile = useCallback(async ({
    userName,
    goal,
    level,
    avatar,
    dailyXpGoal,
  }: {
    userName: string;
    goal: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    avatar?: string | null;
    dailyXpGoal?: DailyXpGoal;
  }) => {
    const chosenAvatar = avatar ?? pickAvatar(userName, level);
    const playerId = progress.playerId || createPlayerId(userName);
    const levelChanged = progress.level !== level;
    const finalDailyXpGoal: DailyXpGoal = dailyXpGoal ?? progress.dailyXpGoal ?? 20;
    const nextProgress: Progress = {
      ...progress,
      userName,
      playerId,
      goal,
      level,
      avatar: chosenAvatar,
      dailyXpGoal: finalDailyXpGoal,
      isOnboarded: true,
      completedLessons: levelChanged ? [] : progress.completedLessons,
      placement: levelChanged ? null : progress.placement,
      lastProfile: {
        userName,
        goal,
        level,
        avatar: chosenAvatar,
        playerId,
        dailyXpGoal: finalDailyXpGoal,
      },
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
  }, [progress]);

  const setDailyXpGoal = useCallback(async (goal: DailyXpGoal) => {
    const nextProgress: Progress = {
      ...progress,
      dailyXpGoal: goal,
      lastProfile: progress.lastProfile
        ? { ...progress.lastProfile, dailyXpGoal: goal }
        : progress.lastProfile,
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
      dailyXpGoal: progress.lastProfile.dailyXpGoal ?? progress.dailyXpGoal ?? 20,
      isOnboarded: true,
    };

    setProgress(nextProgress);
    await persistProgress(nextProgress);
  }, [progress]);

  const refillHearts = useCallback(async () => {
    const nextProgress: Progress = {
      ...progress,
      hearts: MAX_HEARTS,
      nextHeartAt: null,
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

  const secondsUntilNextHeart = useMemo(() => {
    if (progress.hearts >= MAX_HEARTS || !progress.nextHeartAt) return null;
    const remaining = Math.max(0, new Date(progress.nextHeartAt).getTime() - Date.now());
    return Math.ceil(remaining / 1000);
  }, [progress.hearts, progress.nextHeartAt]);

  return {
    units,
    lessons,
    progress,
    session,
    feedback,
    currentQuestion,
    isLoaded,
    hasReviewItems: Object.keys(progress.missedBank).length > 0,
    secondsUntilNextHeart,
    maxHearts: MAX_HEARTS,
    startLesson,
    startReview,
    submitAnswer,
    advanceSession,
    resetSession,
    saveProfile,
    setDailyXpGoal,
    startOverProfile,
    loginReturningUser,
    addFriendById,
    applyPlacementResult,
    resetPlacement,
    refillHearts,
    avatarOptions: levelAvatars,
    playerDirectory: directoryProfiles,
  };
}
