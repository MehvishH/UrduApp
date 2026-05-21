import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-nastaliq-urdu";

import { BottomNav, type BottomTab } from "./components/BottomNav";
import { ChoiceButton } from "./components/ChoiceButton";
import { AuroraBackground } from "./components/ui/AuroraBackground";
import { BoardConnector } from "./components/ui/BoardConnector";
import { Medal, type MedalRank } from "./components/ui/Medal";
import { PulsingLogo } from "./components/ui/PulsingLogo";
import { theme } from "./constants/theme";
import { getPlacementQuestions } from "./data/lessons";
import { useQuizApp } from "./hooks/useQuizApp";
import { LessonQuestion } from "./types/quiz";
import { romanToUrdu } from "./utils/urdu";
import { errorHaptic, selectionHaptic, successHaptic, tapHaptic } from "./utils/haptics";

const GOALS = [
  "Speak with family",
  "Travel confidently",
  "Read and understand basics",
  "Build a daily habit",
] as const;

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const SUGGESTED_FRIENDS = [
  { id: "UA-SUGG-01", name: "Imran from Karachi", avatar: "🧑‍🎓", mutual: 3, level: "Intermediate" },
  { id: "UA-SUGG-02", name: "Nadia from London", avatar: "🧕", mutual: 2, level: "Beginner" },
  { id: "UA-SUGG-03", name: "Bilal from Dubai", avatar: "🧔", mutual: 4, level: "Advanced" },
  { id: "UA-SUGG-04", name: "Saima from Lahore", avatar: "👩‍💼", mutual: 1, level: "Intermediate" },
  { id: "UA-SUGG-05", name: "Faraz from Boston", avatar: "🧑‍💻", mutual: 2, level: "Beginner" },
] as const;
const logoImage = require("./assets/urdu-aura-logo.png");
const BOARD_LANES = [
  ["flex-start", "flex-end", "center", "flex-end", "flex-start"],
  ["flex-end", "flex-start", "center", "flex-start", "flex-end"],
] as const;
const LEADERBOARD_FILTERS = ["All players", "Friends"] as const;

function isGoalOption(value: string | null): value is (typeof GOALS)[number] {
  return value !== null && GOALS.includes(value as (typeof GOALS)[number]);
}

export default function App() {
  const {
    units,
    lessons,
    progress,
    session,
    feedback,
    currentQuestion,
    isLoaded,
    hasReviewItems,
    startLesson,
    startReview,
    submitAnswer,
    resetSession,
    saveProfile,
    loginReturningUser,
    addFriendById,
    applyPlacementResult,
    resetPlacement,
    avatarOptions,
  } = useQuizApp();
  const [appStage, setAppStage] = useState<"landing" | "auth" | "placement" | "main">("landing");
  const [placementQuestions, setPlacementQuestions] = useState<LessonQuestion[]>([]);
  const [placementIndex, setPlacementIndex] = useState(0);
  const [placementCorrect, setPlacementCorrect] = useState(0);
  const [placementAnswered, setPlacementAnswered] = useState(false);
  const [placementLastCorrect, setPlacementLastCorrect] = useState<boolean | null>(null);
  const [placementSummary, setPlacementSummary] = useState<{ score: number; total: number; startingUnit: number } | null>(null);
  const [entryPath, setEntryPath] = useState<"welcome" | "new" | "returning">("welcome");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<(typeof GOALS)[number] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<(typeof LEVELS)[number] | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedBuilderIndices, setSelectedBuilderIndices] = useState<number[]>([]);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<"home" | "practice" | "leaderboard" | "editProfile" | "findFriends" | "profile">("home");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<(typeof LEADERBOARD_FILTERS)[number]>("All players");
  const [friendIdInput, setFriendIdInput] = useState("");
  const [friendLookupMessage, setFriendLookupMessage] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState("");
  const [showFriendIdAdd, setShowFriendIdAdd] = useState(false);
  const [fontsLoaded] = useFonts({
    NotoNastaliqUrdu_400Regular,
    NotoNastaliqUrdu_700Bold,
  });

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const lastFeedbackId = useRef<string | null>(null);

  useEffect(() => {
    setSelectedBuilderIndices([]);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (entryPath !== "welcome") {
      setOnboardingStep(0);
    }
  }, [entryPath]);

  useEffect(() => {
    if (!feedback) {
      feedbackAnim.setValue(0);
      lastFeedbackId.current = null;
      return;
    }
    const key = `${feedback.wasCorrect ? "ok" : "no"}-${feedback.message}`;
    if (lastFeedbackId.current === key) return;
    lastFeedbackId.current = key;
    if (feedback.wasCorrect) {
      successHaptic();
    } else {
      errorHaptic();
    }
    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [feedback, feedbackAnim]);

  if (!isLoaded || !fontsLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar barStyle="light-content" />
        <AuroraBackground style={styles.loadingBackdrop} variant="dark">
          <View style={styles.loadingWrap}>
            <PulsingLogo source={logoImage} size={148} />
            <Text style={[styles.eyebrow, styles.eyebrowOnDark]}>Urdu Aura</Text>
            <Text style={[styles.loadingTitle, styles.onDarkText]}>Tuning your lessons...</Text>
          </View>
        </AuroraBackground>
      </SafeAreaView>
    );
  }

  const sessionFinished = Boolean(session?.isFinished);
  const showOnboarding = appStage === "landing" || appStage === "auth";
  const showPlacement = appStage === "placement";

  const startPlacementFlow = (level: "Beginner" | "Intermediate" | "Advanced") => {
    const questions = getPlacementQuestions(level);
    const shuffled = questions.map((question) => ({
      ...question,
      choices: question.choices ? [...question.choices].sort(() => Math.random() - 0.5) : undefined,
    }));
    setPlacementQuestions(shuffled);
    setPlacementIndex(0);
    setPlacementCorrect(0);
    setPlacementAnswered(false);
    setPlacementLastCorrect(null);
    setPlacementSummary(null);
    setAppStage("placement");
  };

  const completeOnboarding = async () => {
    if (!selectedGoal || !selectedLevel) {
      return;
    }

    const finalName = nameInput.trim() || (entryPath === "returning" ? progress.userName : "Learner");
    await saveProfile({
      userName: finalName,
      goal: selectedGoal,
      level: selectedLevel,
      avatar: selectedAvatar,
    });
    startPlacementFlow(selectedLevel);
  };

  const wizardTotal = 4;
  const canAdvanceWizard = (() => {
    if (onboardingStep === 0) return nameInput.trim().length > 0;
    if (onboardingStep === 1) return selectedLevel !== null;
    if (onboardingStep === 2) return selectedGoal !== null;
    if (onboardingStep === 3) return selectedAvatar !== null;
    return false;
  })();

  const wizardNext = () => {
    if (!canAdvanceWizard) return;
    if (onboardingStep < wizardTotal - 1) {
      selectionHaptic();
      setOnboardingStep((step) => Math.min(wizardTotal - 1, step + 1));
      return;
    }
    successHaptic();
    void completeOnboarding();
  };

  const wizardBack = () => {
    tapHaptic();
    if (onboardingStep === 0) {
      setEntryPath("welcome");
      return;
    }
    setOnboardingStep((step) => Math.max(0, step - 1));
  };

  const handlePlacementAnswer = (choice: string) => {
    if (placementAnswered) return;
    const question = placementQuestions[placementIndex];
    if (!question) return;
    selectionHaptic();
    const isCorrect = choice === question.answerUr;
    setPlacementLastCorrect(isCorrect);
    setPlacementAnswered(true);
    if (isCorrect) {
      setPlacementCorrect((current) => current + 1);
      successHaptic();
    } else {
      errorHaptic();
    }
  };

  const advancePlacement = async () => {
    const total = placementQuestions.length;
    const nextIndex = placementIndex + 1;
    const finalScore = placementCorrect;

    if (nextIndex < total) {
      setPlacementIndex(nextIndex);
      setPlacementAnswered(false);
      setPlacementLastCorrect(null);
      return;
    }

    const summary = await applyPlacementResult(finalScore, total);
    setPlacementSummary(summary);
    successHaptic();
  };

  const finishPlacement = () => {
    setPlacementQuestions([]);
    setPlacementIndex(0);
    setPlacementCorrect(0);
    setPlacementAnswered(false);
    setPlacementLastCorrect(null);
    setPlacementSummary(null);
    setAppStage("main");
  };

  const retakePlacement = async () => {
    if (!progress.level) return;
    await resetPlacement();
    startPlacementFlow(progress.level);
  };

  const playPlacementAudio = (audioText: string) => {
    void playPromptAudio(audioText);
  };

  const playPromptAudio = async (romanText: string) => {
    Speech.stop();
    const urduText = romanToUrdu(romanText);

    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const urduVoice = voices.find((voice) => (voice.language?.toLowerCase() ?? "").startsWith("ur"));
      const fallbackVoice = voices.find((voice) => ["en-in", "en-gb", "en-us"].includes(voice.language?.toLowerCase() ?? ""));

      if (urduVoice) {
        Speech.speak(urduText, {
          language: urduVoice.language,
          voice: urduVoice.identifier,
          rate: 0.5,
          pitch: 1,
        });
        return;
      }

      Speech.speak(romanText, {
        language: fallbackVoice?.language ?? "en-US",
        voice: fallbackVoice?.identifier,
        rate: 0.45,
        pitch: 1,
      });
    } catch {
      Speech.speak(romanText, {
        language: "en-US",
        rate: 0.45,
        pitch: 1,
      });
    }
  };

  const formatUrduAnswer = (romanText: string) => `${romanToUrdu(romanText)} (${romanText})`;

  const previewLesson = units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === previewLessonId) ?? null;
  const reviewPreview = lessons
    .flatMap((lesson) => lesson.questions.map((question) => ({
      ...question,
      lessonTitle: lesson.title,
      misses: progress.missedBank[question.id] ?? 0,
    })))
    .filter((question) => question.misses > 0)
    .sort((first, second) => second.misses - first.misses)
    .slice(0, 6);
  const leaderboardMode = mainView === "leaderboard";

  const leaderboardGroups = [
    {
      title: "State",
      caption: "Players learning near you",
      entries: [
        { name: "Sana from New York", score: progress.xp + 120, streak: Math.max(progress.streak + 2, 3), medal: "🥇" },
        { name: progress.userName, score: progress.xp, streak: progress.streak, medal: "🥈", you: true },
        { name: "Ayaan from New Jersey", score: Math.max(progress.xp - 40, 15), streak: Math.max(progress.streak - 1, 1), medal: "🥉" },
      ],
    },
    {
      title: "Country",
      caption: "Top Urdu Aura learners in the U.S.",
      entries: [
        { name: "Zoya from California", score: progress.xp + 240, streak: Math.max(progress.streak + 4, 5), medal: "🥇" },
        { name: "Mika from Texas", score: progress.xp + 90, streak: Math.max(progress.streak + 1, 2), medal: "🥈" },
        { name: progress.userName, score: progress.xp, streak: progress.streak, medal: "⭐", you: true },
      ],
    },
    {
      title: "Continent",
      caption: "North America leaderboard",
      entries: [
        { name: "Hiba from Toronto", score: progress.xp + 320, streak: Math.max(progress.streak + 6, 7), medal: "🥇" },
        { name: "Omar from Chicago", score: progress.xp + 140, streak: Math.max(progress.streak + 3, 4), medal: "🥈" },
        { name: progress.userName, score: progress.xp, streak: progress.streak, medal: "💚", you: true },
      ],
    },
  ];
  const friendLeaderboardGroups = [
    {
      title: "Friends",
      caption: "People you follow in Urdu Aura",
      entries: [
        ...[
          ...progress.friends.map((friend, index) => ({
            name: friend.name,
            score: friend.xp,
            streak: friend.streak,
            medal: ["🥇", "🥈", "🥉", "💚"][index] ?? "💚",
          })),
          { name: progress.userName, score: progress.xp, streak: progress.streak, medal: "⭐", you: true },
        ].sort((first, second) => second.score - first.score),
      ],
    },
  ];
  const activeLeaderboardGroups = leaderboardFilter === "Friends" ? friendLeaderboardGroups : leaderboardGroups;
  const podiumSource = activeLeaderboardGroups[0]?.entries ?? [];
  const podiumLeaders = [
    podiumSource[1] ?? podiumSource[0],
    podiumSource[0],
    podiumSource[2] ?? podiumSource[1] ?? podiumSource[0],
  ];

  const openProfileEditor = () => {
    setNameInput(progress.userName);
    setSelectedGoal(isGoalOption(progress.goal) ? progress.goal : GOALS[0]);
    setSelectedLevel(progress.level ?? "Beginner");
    setSelectedAvatar(progress.avatar ?? (progress.level ? avatarOptions[progress.level][0] : avatarOptions.Beginner[0]));
    setProfileMenuOpen(false);
    setMainView("editProfile");
  };

  const openFindFriends = () => {
    setFriendIdInput("");
    setFriendLookupMessage(null);
    setProfileMenuOpen(false);
    setMainView("findFriends");
  };

  const saveEditedProfile = () => {
    if (!selectedGoal || !selectedLevel) {
      return;
    }

    const finalName = nameInput.trim() || progress.userName || "Learner";
    void saveProfile({
      userName: finalName,
      goal: selectedGoal,
      level: selectedLevel,
      avatar: selectedAvatar,
    });
    setMainView("home");
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setMainView("home");
    setPreviewLessonId(null);
    resetSession();
    setAppStage("auth");
    setEntryPath("welcome");
  };

  const handleAddFriend = async () => {
    const result = await addFriendById(friendIdInput);
    setFriendLookupMessage(result.message);
    if (result.ok) {
      setFriendIdInput("");
      setLeaderboardFilter("Friends");
    }
  };

  const activeBottomTab: BottomTab = (() => {
    if (mainView === "leaderboard") return "league";
    if (mainView === "findFriends") return "friends";
    if (mainView === "editProfile" || mainView === "profile") return "profile";
    return "learn";
  })();

  const handleBottomTabChange = (tab: BottomTab) => {
    setProfileMenuOpen(false);
    setPreviewLessonId(null);
    if (tab === "learn") {
      setMainView("home");
      return;
    }
    if (tab === "league") {
      setMainView("leaderboard");
      return;
    }
    if (tab === "friends") {
      setFriendIdInput("");
      setFriendLookupMessage(null);
      setMainView("findFriends");
      return;
    }
    setMainView("profile");
  };

  const addBuilderWord = (wordIndex: number) => {
    selectionHaptic();
    setSelectedBuilderIndices((current) => [...current, wordIndex]);
  };

  const removeBuilderWord = (wordPosition: number) => {
    tapHaptic();
    setSelectedBuilderIndices((current) => current.filter((_, index) => index !== wordPosition));
  };

  const isUnitUnlocked = (unitIndex: number) => {
    if (unitIndex === 0) {
      return true;
    }
    const previousUnit = units[unitIndex - 1];
    return previousUnit.lessons.every((lesson) => progress.completedLessons.includes(lesson.id));
  };

  const isLessonUnlocked = (unitIndex: number, lessonIndex: number) => {
    if (!isUnitUnlocked(unitIndex)) {
      return false;
    }
    if (lessonIndex === 0) {
      return true;
    }
    const priorLesson = units[unitIndex].lessons[lessonIndex - 1];
    return progress.completedLessons.includes(priorLesson.id);
  };

  const headerState = (() => {
    if (showPlacement) {
      return { label: "", action: null as null | (() => void) };
    }
    if (showOnboarding && entryPath !== "welcome") {
      return {
        label: "Back",
        action: () => setEntryPath("welcome" as const),
      };
    }
    if (appStage === "auth" && entryPath === "welcome") {
      return {
        label: "Back",
        action: () => setAppStage("landing"),
      };
    }
    if (previewLesson) {
      return {
        label: "Back",
        action: () => setPreviewLessonId(null),
      };
    }
    if (mainView === "practice") {
      return {
        label: "Back",
        action: () => setMainView("home"),
      };
    }
    if (mainView === "leaderboard") {
      return {
        label: "Back",
        action: () => setMainView("home"),
      };
    }
    if (mainView === "editProfile") {
      return {
        label: "Back",
        action: () => setMainView("profile"),
      };
    }
    if (mainView === "findFriends") {
      return {
        label: "Back",
        action: () => setMainView("home"),
      };
    }
    if (mainView === "profile") {
      return {
        label: "",
        action: null as null | (() => void),
      };
    }
    if (session) {
      return {
        label: "Back",
        action: () => resetSession(),
      };
    }
    return {
      label: "",
      action: null as null | (() => void),
    };
  })();

  const openProfileMenu = () => {
    tapHaptic();
    setProfileMenuOpen(true);
  };

  const profileMenuItems = [
    { label: "Edit profile", onPress: openProfileEditor },
    { label: "Find friends", onPress: openFindFriends },
    {
      label: "Leaderboard",
      onPress: () => {
        setProfileMenuOpen(false);
        setMainView("leaderboard");
      },
    },
    { label: "Log out", onPress: handleLogout, danger: true },
  ];

  const onDarkBg = appStage !== "main";
  const onDarkText = onDarkBg ? styles.onDarkText : undefined;
  const onDarkTextSoft = onDarkBg ? styles.onDarkTextSoft : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, onDarkBg ? styles.safeAreaDark : undefined]}>
      <StatusBar barStyle={onDarkBg ? "light-content" : "dark-content"} />
      <AuroraBackground style={styles.appBackdrop} variant={onDarkBg ? "dark" : "default"}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {appStage === "landing" ? null : headerState.action ? (
              <Pressable
                onPress={() => {
                  tapHaptic();
                  headerState.action?.();
                }}
                style={({ pressed }) => [
                  styles.navChip,
                  onDarkBg ? styles.navChipDark : undefined,
                  pressed ? (onDarkBg ? styles.navChipDarkPressed : styles.navChipPressed) : undefined,
                ]}
              >
                <Text style={[styles.navChipLabel, onDarkText]}>← {headerState.label}</Text>
              </Pressable>
            ) : <View style={styles.topBarSpacer} />}
          </View>
          {appStage !== "main" ? <View style={styles.topBarSpacer} /> : (
            <View style={styles.profileMenuWrap}>
              <Pressable
                onPress={openProfileMenu}
                style={({ pressed }) => [
                  styles.topBarBrand,
                  pressed ? styles.topBarBrandPressed : undefined,
                ]}
              >
                <Text style={styles.topProfileName}>{progress.userName}</Text>
                <View style={styles.topProfileAvatar}>
                  <Text style={styles.topProfileAvatarText}>{progress.avatar ?? "🐱"}</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <Modal
          visible={profileMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileMenuOpen(false)}
        >
          <Pressable
            style={styles.modalScrim}
            onPress={() => setProfileMenuOpen(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalProfileRow}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{progress.avatar ?? "🐱"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalProfileName}>{progress.userName}</Text>
                  <Text style={styles.modalProfileMeta}>
                    {progress.level ?? "Beginner"} · {progress.xp} XP
                  </Text>
                </View>
              </View>
              <View style={styles.modalDivider} />
              {profileMenuItems.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    selectionHaptic();
                    item.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.modalItem,
                    pressed ? styles.modalItemPressed : undefined,
                  ]}
                >
                  <Text style={[styles.modalItemLabel, item.danger ? styles.modalItemDanger : undefined]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.modalChevron, item.danger ? styles.modalItemDanger : undefined]}>›</Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {showOnboarding ? (
          <View style={styles.onboardingWrap}>
            {appStage === "landing" ? (
              <View style={styles.landingWrap}>
                <Image source={logoImage} style={styles.landingLogo} resizeMode="cover" />
                <Text style={[styles.brand, styles.brandOnDark]}>Urdu Aura - Apni Zabaan</Text>
                <Text style={[styles.tagline, styles.taglineOnDark]}>Grow from first phrases to deeper fluency.</Text>
                <Pressable
                  onPress={() => {
                    setAppStage("auth");
                    setEntryPath("welcome");
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.primaryButtonAura,
                    pressed ? styles.primaryButtonAuraPressed : undefined,
                  ]}
                >
                  <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelDark]}>Ready to learn</Text>
                </Pressable>
              </View>
            ) : (
              <>
            <Image source={logoImage} style={styles.heroLogo} resizeMode="cover" />
            <Text style={[styles.brand, styles.brandOnDark]}>Urdu Aura</Text>
            <Text style={[styles.tagline, styles.taglineOnDark]}>Grow from first phrases to deeper fluency.</Text>

            {entryPath === "welcome" && (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Learn, reconnect, and level up</Text>
                <Text style={styles.sectionCopy}>
                  Urdu Aura helps non-native speakers learn Urdu with clarity and confidence, while current
                  speakers can grow vocabulary, strengthen expression, and sharpen everyday communication.
                </Text>
                <Pressable onPress={() => setEntryPath("new")} style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : undefined,
                ]}>
                  <Text style={styles.primaryButtonLabel}>I am a new user</Text>
                </Pressable>
                <Pressable onPress={() => {
                  const savedGoal = progress.lastProfile?.goal ?? null;
                  setEntryPath("returning");
                  setNameInput(progress.lastProfile?.userName ?? "");
                  setSelectedGoal(isGoalOption(savedGoal) ? savedGoal : null);
                  setSelectedLevel(progress.lastProfile?.level ?? null);
                  setSelectedAvatar(progress.lastProfile?.avatar ?? null);
                }} style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.secondaryButtonPressed : undefined,
                ]}>
                  <Text style={styles.secondaryButtonLabel}>I am a returning user</Text>
                </Pressable>
              </View>
            )}

            {entryPath === "returning" && progress.lastProfile ? (
              <View style={styles.returningCardStandalone}>
                <Text style={styles.returningTitle}>Welcome back</Text>
                <View style={styles.returningProfileRow}>
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>{progress.lastProfile.avatar}</Text>
                  </View>
                  <Text style={styles.returningCopy}>{progress.lastProfile.userName}</Text>
                </View>
                <Text style={styles.returningMeta}>
                  Goal: {progress.lastProfile.goal} | Level: {progress.lastProfile.level}
                </Text>
                <Pressable
                  onPress={() => {
                    void loginReturningUser();
                    setAppStage("main");
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.primaryButtonAura,
                    pressed ? styles.primaryButtonAuraPressed : undefined,
                  ]}
                >
                  <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelDark]}>Continue as {progress.lastProfile.userName}</Text>
                </Pressable>
                <Text style={styles.returningHint}>Or set up a fresh profile below.</Text>
              </View>
            ) : null}

            {entryPath !== "welcome" && (
              <View style={styles.panel}>
                <View style={styles.wizardHeader}>
                  <Text style={styles.wizardEyebrow}>
                    Step {onboardingStep + 1} of {wizardTotal}
                  </Text>
                  <View style={styles.wizardProgressTrack}>
                    <View
                      style={[
                        styles.wizardProgressFill,
                        { width: `${((onboardingStep + 1) / wizardTotal) * 100}%` },
                      ]}
                    />
                  </View>
                </View>

                {entryPath === "returning" && !progress.lastProfile ? (
                  <Text style={styles.sectionCopy}>No saved profile yet — let's set one up.</Text>
                ) : null}

                {onboardingStep === 0 ? (
                  <View style={styles.wizardStep}>
                    <Text style={styles.wizardTitle}>What should we call you?</Text>
                    <Text style={styles.wizardHelper}>This is how you'll show up on leaderboards and friend lists.</Text>
                    <TextInput
                      placeholder="Enter your name"
                      placeholderTextColor={theme.colors.muted}
                      value={nameInput}
                      onChangeText={setNameInput}
                      style={styles.input}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={wizardNext}
                    />
                  </View>
                ) : null}

                {onboardingStep === 1 ? (
                  <View style={styles.wizardStep}>
                    <Text style={styles.wizardTitle}>Where are you starting from?</Text>
                    <Text style={styles.wizardHelper}>Pick the level that best matches your Urdu right now.</Text>
                    <View style={styles.levelStack}>
                      {LEVELS.map((level) => (
                        <Pressable
                          key={level}
                          onPress={() => {
                            selectionHaptic();
                            setSelectedLevel(level);
                            setSelectedAvatar((currentAvatar) => currentAvatar ?? avatarOptions[level][0]);
                          }}
                          style={({ pressed }) => [
                            styles.wizardOption,
                            selectedLevel === level ? styles.wizardOptionActive : undefined,
                            pressed ? styles.wizardOptionPressed : undefined,
                          ]}
                        >
                          <Text
                            style={[
                              styles.wizardOptionLabel,
                              selectedLevel === level ? styles.wizardOptionLabelActive : undefined,
                            ]}
                          >
                            {level}
                          </Text>
                          <Text style={styles.wizardOptionDetail}>
                            {level === "Beginner"
                              ? "I'm just getting started."
                              : level === "Intermediate"
                              ? "I can hold a basic conversation."
                              : "I want fluency and nuance."}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {onboardingStep === 2 ? (
                  <View style={styles.wizardStep}>
                    <Text style={styles.wizardTitle}>Why are you learning Urdu?</Text>
                    <Text style={styles.wizardHelper}>We'll tailor the lessons to match your goal.</Text>
                    <View style={styles.optionGrid}>
                      {GOALS.map((goal) => (
                        <Pressable
                          key={goal}
                          onPress={() => {
                            selectionHaptic();
                            setSelectedGoal(goal);
                          }}
                          style={({ pressed }) => [
                            styles.optionChip,
                            selectedGoal === goal ? styles.optionChipActive : undefined,
                            pressed ? styles.optionChipPressed : undefined,
                          ]}
                        >
                          <Text style={[
                            styles.optionChipLabel,
                            selectedGoal === goal ? styles.optionChipLabelActive : undefined,
                          ]}>
                            {goal}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {onboardingStep === 3 ? (
                  <View style={styles.wizardStep}>
                    <Text style={styles.wizardTitle}>Pick a profile picture</Text>
                    <Text style={styles.wizardHelper}>You can change this anytime in Profile.</Text>
                    <View style={styles.avatarPickerRow}>
                      {(selectedLevel ? avatarOptions[selectedLevel] : avatarOptions.Beginner).map((avatar) => (
                        <Pressable
                          key={avatar}
                          onPress={() => {
                            selectionHaptic();
                            setSelectedAvatar(avatar);
                          }}
                          style={({ pressed }) => [
                            styles.avatarChoice,
                            selectedAvatar === avatar ? styles.avatarChoiceActive : undefined,
                            pressed ? styles.optionChipPressed : undefined,
                          ]}
                        >
                          <Text style={styles.avatarChoiceText}>{avatar}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={wizardNext}
                  disabled={!canAdvanceWizard}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.primaryButtonAura,
                    !canAdvanceWizard ? styles.disabledButton : undefined,
                    pressed && canAdvanceWizard ? styles.primaryButtonAuraPressed : undefined,
                  ]}
                >
                  <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelDark]}>
                    {onboardingStep === wizardTotal - 1 ? "Start placement" : "Continue"}
                  </Text>
                </Pressable>

                <Pressable onPress={wizardBack} style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>
                    {onboardingStep === 0 ? "Back" : "Previous step"}
                  </Text>
                </Pressable>
              </View>
            )}
              </>
            )}
          </View>
        ) : showPlacement ? (
          (() => {
            const total = placementQuestions.length;
            const currentPlacement = placementQuestions[placementIndex];
            const isResults = placementSummary !== null;

            if (isResults && placementSummary) {
              const accuracy = total > 0 ? Math.round((placementSummary.score / total) * 100) : 0;
              const tier =
                accuracy >= 80 ? { emoji: "🏆", title: "Mastery start", copy: "You've got serious Urdu chops — we'll skip ahead so the lessons stay challenging." }
                : accuracy >= 50 ? { emoji: "🌟", title: "Builder start", copy: "Solid foundation. We'll start mid-curriculum so you keep growing." }
                : { emoji: "🌱", title: "Starter start", copy: "Perfect starting point — we'll begin with the essentials." };
              return (
                <View style={styles.placementResultHero}>
                  <Text style={styles.placementResultEmoji}>{tier.emoji}</Text>
                  <Text style={styles.placementResultTitle}>{tier.title}</Text>
                  <Text style={styles.placementResultScore}>{placementSummary.score} / {placementSummary.total} correct</Text>
                  <View style={styles.placementResultMeterTrack}>
                    <View style={[styles.placementResultMeterFill, { width: `${accuracy}%` }]} />
                  </View>
                  <Text style={styles.placementResultAccuracy}>{accuracy}% accuracy</Text>
                  <View style={styles.placementResultUnitBlock}>
                    <Text style={styles.placementResultLabel}>Starting unit</Text>
                    <Text style={styles.placementResultUnitValue}>Unit {placementSummary.startingUnit}</Text>
                    <Text style={styles.placementResultCopy}>{tier.copy}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      tapHaptic();
                      finishPlacement();
                    }}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.primaryButtonAura,
                      pressed ? styles.primaryButtonAuraPressed : undefined,
                    ]}
                  >
                    <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelDark]}>Continue to home</Text>
                  </Pressable>
                </View>
              );
            }

            if (!currentPlacement) {
              return (
                <View style={styles.placementResultsCard}>
                  <Text style={styles.sectionTitle}>Preparing your placement test...</Text>
                </View>
              );
            }

            const progressRatio = total > 0 ? (placementIndex + 1) / total : 0;
            return (
              <View style={styles.placementCard}>
                <View style={styles.placementHeader}>
                  <Text style={styles.eyebrow}>Placement test</Text>
                  <Text style={styles.placementCounter}>Question {placementIndex + 1} of {total}</Text>
                </View>
                <Text style={styles.placementCopy}>
                  Answer 10 quick questions so we can shape your lesson path.
                </Text>
                <View style={styles.placementProgressTrack}>
                  <View style={[styles.placementProgressFill, { width: `${progressRatio * 100}%` }]} />
                </View>
                <Text style={styles.question}>{currentPlacement.promptEn}</Text>
                {currentPlacement.helperText ? (
                  <Text style={styles.helper}>{currentPlacement.helperText}</Text>
                ) : null}
                {currentPlacement.type === "listenMeaning" ? (
                  <Pressable
                    onPress={() => playPlacementAudio(currentPlacement.audioText)}
                    style={({ pressed }) => [
                      styles.audioButton,
                      pressed ? styles.audioButtonPressed : undefined,
                    ]}
                  >
                    <Text style={styles.audioButtonLabel}>Play Urdu audio</Text>
                  </Pressable>
                ) : null}
                <View style={styles.choiceList}>
                  {(currentPlacement.choices ?? []).map((choice) => {
                    const isCorrectChoice = choice === currentPlacement.answerUr;
                    const showOutcome = placementAnswered;
                    const isUrduChoice = currentPlacement.type === "translateToUrdu";
                    return (
                      <Pressable
                        key={choice}
                        disabled={placementAnswered}
                        onPress={() => handlePlacementAnswer(choice)}
                        style={({ pressed }) => [
                          styles.placementChoice,
                          showOutcome && isCorrectChoice ? styles.placementChoiceCorrect : undefined,
                          showOutcome && !isCorrectChoice ? styles.placementChoiceMuted : undefined,
                          pressed && !placementAnswered ? styles.placementChoicePressed : undefined,
                        ]}
                      >
                        {isUrduChoice ? (
                          <Text style={styles.placementChoiceUrdu}>{romanToUrdu(choice)}</Text>
                        ) : null}
                        <Text style={isUrduChoice ? styles.placementChoiceRoman : styles.placementChoiceLabel}>
                          {choice}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {placementAnswered ? (
                  <View
                    style={[
                      styles.feedbackCard,
                      placementLastCorrect ? styles.feedbackGood : styles.feedbackBad,
                    ]}
                  >
                    <Text style={styles.feedbackTitle}>
                      {placementLastCorrect ? "✓ Correct" : "✗ Not quite"}
                    </Text>
                    {!placementLastCorrect ? (
                      <Text style={styles.feedbackAnswer}>
                        Correct answer: {formatUrduAnswer(currentPlacement.answerUr)}
                      </Text>
                    ) : null}
                    <Text style={styles.feedbackCopy}>{currentPlacement.tip}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    void advancePlacement();
                  }}
                  disabled={!placementAnswered}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !placementAnswered ? styles.disabledButton : undefined,
                    pressed && placementAnswered ? styles.primaryButtonPressed : undefined,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {placementIndex + 1 >= total ? "See my placement" : "Next question"}
                  </Text>
                </Pressable>
              </View>
            );
          })()
        ) : (
          <>
            {mainView === "home" ? (
              <>
                <View style={styles.hero}>
                  <View style={styles.heroTopRow}>
                    <View>
                      <Text style={styles.eyebrow}>Urdu Aura</Text>
                      <View style={styles.profileTitleRow}>
                        <View style={styles.avatarBadge}>
                          <Text style={styles.avatarBadgeText}>{progress.avatar ?? "🐱"}</Text>
                        </View>
                        <Text style={styles.title}>Hi {progress.userName}, ready for your next lesson?</Text>
                      </View>
                    </View>
                    <Image source={logoImage} style={styles.heroMiniLogo} resizeMode="cover" />
                  </View>
                  <Text style={styles.subtitle}>
                    Goal: {progress.goal ?? "Build confidence"} | Level: {progress.level ?? "Beginner"}
                  </Text>
                  {progress.placement ? (
                    <View style={styles.placementChip}>
                      <Text style={styles.placementChipLabel}>
                        Placement {progress.placement.score}/{progress.placement.total} · Starting Unit {progress.placement.startingUnit}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.progressDeck}>
                  <View style={styles.leaderboardCard}>
                    <Text style={styles.leaderboardTitle}>Progress board</Text>
                    <View style={styles.leaderboardRow}>
                      <View style={styles.leaderboardRank}>
                        <Text style={styles.leaderboardRankText}>#1</Text>
                      </View>
                      <View style={styles.leaderboardMeta}>
                        <Text style={styles.leaderboardName}>XP Race</Text>
                        <Text style={styles.leaderboardDetail}>You are building steady points</Text>
                      </View>
                      <Text style={styles.leaderboardScore}>{progress.xp} XP</Text>
                    </View>
                    <View style={styles.leaderboardRow}>
                      <View style={[styles.leaderboardRank, styles.streakRank]}>
                        <Text style={styles.leaderboardRankText}>#2</Text>
                      </View>
                      <View style={styles.leaderboardMeta}>
                        <Text style={styles.leaderboardName}>Streak Run</Text>
                        <Text style={styles.leaderboardDetail}>Keep your fire alive every day</Text>
                      </View>
                      <Text style={styles.leaderboardScore}>{progress.streak} days</Text>
                    </View>
                  </View>

                  <View style={styles.sideWidgets}>
                    <Pressable
                      onPress={() => setMainView("practice")}
                      style={({ pressed }) => [
                        styles.practicePortal,
                        pressed ? styles.practicePortalPressed : undefined,
                      ]}
                    >
                      <Text style={styles.practicePortalIcon}>🗂️</Text>
                      <Text style={styles.practicePortalLabel}>Practice</Text>
                    </Pressable>

                    <View style={styles.heartJarCard}>
                      <View style={styles.heartJarCounter}>
                        <Text style={styles.heartJarCounterText}>{progress.hearts}</Text>
                      </View>
                      <Text style={styles.heartJarLabel}>Heart Jar</Text>
                      <View style={styles.heartJarBody}>
                        <Text style={styles.heartJarHearts}>
                          {"💚".repeat(progress.hearts)}
                          {"🤍".repeat(Math.max(3 - progress.hearts, 0))}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {!session && (
              <>
                {previewLesson ? (
                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>{previewLesson.title}</Text>
                    <Text style={styles.sectionCopy}>{previewLesson.description}</Text>
                    {previewLesson.phrases.map((phrase, index) => (
                      <View key={`${previewLesson.id}-phrase-${index}`} style={styles.previewPhraseCard}>
                        <Text style={styles.previewEnglish}>{phrase.english}</Text>
                        <Text style={styles.previewRoman}>{phrase.transliteration}</Text>
                        <Text style={styles.previewUrdu}>{phrase.urduText}</Text>
                      </View>
                    ))}
                    <Pressable
                      onPress={() => {
                        setPreviewLessonId(null);
                        void startLesson(previewLesson.id);
                      }}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed ? styles.primaryButtonPressed : undefined,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>Start lesson test</Text>
                    </Pressable>
                    <Pressable onPress={() => setPreviewLessonId(null)} style={styles.textButton}>
                      <Text style={styles.textButtonLabel}>Back to lessons</Text>
                    </Pressable>
                  </View>
                ) : mainView === "practice" ? (
                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Daily practice flashcards</Text>
                    <Text style={styles.sectionCopy}>
                      Open your weak words here and sharpen them in a quick review round.
                    </Text>
                    {reviewPreview.length > 0 ? reviewPreview.map((card) => (
                      <View key={card.id} style={styles.flashcardPreview}>
                        <Text style={styles.flashcardPrompt}>{card.promptEn}</Text>
                        <Text style={styles.flashcardAnswer}>{formatUrduAnswer(card.answerUr)}</Text>
                        <Text style={styles.flashcardMeta}>
                          {card.lessonTitle} | missed {card.misses} time{card.misses === 1 ? "" : "s"}
                        </Text>
                      </View>
                    )) : (
                      <View style={styles.flashcardEmpty}>
                        <Text style={styles.flashcardEmptyTitle}>No review cards yet</Text>
                        <Text style={styles.sectionCopy}>Finish a few lessons and any missed answers will appear here.</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => void startReview()}
                      disabled={!hasReviewItems}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        !hasReviewItems ? styles.disabledButton : undefined,
                        pressed && hasReviewItems ? styles.primaryButtonPressed : undefined,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {hasReviewItems ? "Start flashcard practice" : "No flashcards ready"}
                      </Text>
                    </Pressable>
                  </View>
                ) : leaderboardMode ? (
                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Leaderboard</Text>
                    <Text style={styles.sectionCopy}>
                      See how your streak and XP compare across your wider area or just your friends.
                    </Text>
                    <View style={styles.filterRow}>
                      {LEADERBOARD_FILTERS.map((filter) => (
                        <Pressable
                          key={filter}
                          onPress={() => setLeaderboardFilter(filter)}
                          style={({ pressed }) => [
                            styles.filterChip,
                            leaderboardFilter === filter ? styles.filterChipActive : undefined,
                            pressed ? styles.optionChipPressed : undefined,
                          ]}
                        >
                          <Text style={[
                            styles.filterChipLabel,
                            leaderboardFilter === filter ? styles.filterChipLabelActive : undefined,
                          ]}>
                            {filter}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.podiumWrap}>
                      <View style={[styles.podiumLane, styles.podiumLaneSide]}>
                        <View style={styles.podiumAvatar}>
                          <Medal rank="silver" size={42} place={2} />
                        </View>
                        <Text numberOfLines={2} style={styles.podiumName}>{podiumLeaders[0].name}</Text>
                        <View style={[styles.podiumBlock, styles.podiumBlockSecond]}>
                          <Text style={styles.podiumPlace}>2</Text>
                        </View>
                      </View>
                      <View style={[styles.podiumLane, styles.podiumLaneCenter]}>
                        <View style={[styles.podiumAvatar, styles.podiumAvatarWinner]}>
                          <Medal rank="gold" size={52} place={1} />
                        </View>
                        <Text numberOfLines={2} style={styles.podiumName}>{podiumLeaders[1].name}</Text>
                        <View style={[styles.podiumBlock, styles.podiumBlockFirst]}>
                          <Text style={styles.podiumPlace}>1</Text>
                        </View>
                      </View>
                      <View style={[styles.podiumLane, styles.podiumLaneSide]}>
                        <View style={styles.podiumAvatar}>
                          <Medal rank="bronze" size={42} place={3} />
                        </View>
                        <Text numberOfLines={2} style={styles.podiumName}>{podiumLeaders[2].name}</Text>
                        <View style={[styles.podiumBlock, styles.podiumBlockThird]}>
                          <Text style={styles.podiumPlace}>3</Text>
                        </View>
                      </View>
                    </View>
                    {activeLeaderboardGroups.map((group) => (
                      <View key={group.title} style={styles.rankSection}>
                        <Text style={styles.rankSectionTitle}>{group.title}</Text>
                        <Text style={styles.rankSectionCopy}>{group.caption}</Text>
                        {group.entries.map((entry, index) => {
                          const isYou = "you" in entry && entry.you;
                          const rank: MedalRank = isYou
                            ? "you"
                            : index === 0 ? "gold"
                            : index === 1 ? "silver"
                            : index === 2 ? "bronze"
                            : "friend";
                          return (
                            <View key={`${group.title}-${entry.name}-${index}`} style={[
                              styles.rankCard,
                              isYou ? styles.rankCardYou : undefined,
                            ]}>
                              <Medal rank={rank} size={36} place={index < 3 ? index + 1 : undefined} />
                              <View style={styles.rankMeta}>
                                <Text style={styles.rankName}>{entry.name}</Text>
                                <Text style={styles.rankDetail}>{entry.streak} day streak</Text>
                              </View>
                              <Text style={styles.rankScore}>{entry.score} XP</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ) : mainView === "findFriends" ? (
                  (() => {
                    const search = friendSearch.trim().toLowerCase();
                    const filteredFriends = progress.friends.filter((friend) =>
                      search.length === 0 ||
                      friend.name.toLowerCase().includes(search) ||
                      friend.location.toLowerCase().includes(search),
                    );
                    const filteredSuggestions = SUGGESTED_FRIENDS.filter((suggestion) =>
                      (search.length === 0 || suggestion.name.toLowerCase().includes(search)) &&
                      !progress.friends.some((friend) => friend.id === suggestion.id),
                    );
                    return (
                      <>
                        <View style={styles.friendsSearchCard}>
                          <Text style={styles.friendsSearchIcon}>🔍</Text>
                          <TextInput
                            placeholder="Search friends and suggestions"
                            placeholderTextColor={theme.colors.muted}
                            value={friendSearch}
                            onChangeText={setFriendSearch}
                            style={styles.friendsSearchInput}
                          />
                        </View>

                        <View style={styles.panel}>
                          <View style={styles.friendSectionHeader}>
                            <Text style={styles.sectionTitle}>Your friends</Text>
                            <Pressable
                              onPress={() => {
                                tapHaptic();
                                setShowFriendIdAdd((open) => !open);
                              }}
                              style={({ pressed }) => [
                                styles.friendIdToggle,
                                pressed ? styles.friendIdTogglePressed : undefined,
                              ]}
                            >
                              <Text style={styles.friendIdToggleLabel}>
                                {showFriendIdAdd ? "Close" : "+ Add by ID"}
                              </Text>
                            </Pressable>
                          </View>

                          {showFriendIdAdd ? (
                            <View style={styles.friendIdAddBlock}>
                              <Text style={styles.friendIdLabel}>Your player ID · {progress.playerId}</Text>
                              <TextInput
                                placeholder="Enter a player ID like UA-284193"
                                placeholderTextColor={theme.colors.muted}
                                value={friendIdInput}
                                onChangeText={setFriendIdInput}
                                autoCapitalize="characters"
                                style={styles.input}
                              />
                              <Pressable
                                onPress={() => void handleAddFriend()}
                                disabled={!friendIdInput.trim()}
                                style={({ pressed }) => [
                                  styles.primaryButton,
                                  !friendIdInput.trim() ? styles.disabledButton : undefined,
                                  pressed && friendIdInput.trim() ? styles.primaryButtonPressed : undefined,
                                ]}
                              >
                                <Text style={styles.primaryButtonLabel}>Add friend</Text>
                              </Pressable>
                              {friendLookupMessage ? (
                                <View style={styles.friendMessageCard}>
                                  <Text style={styles.friendMessageText}>{friendLookupMessage}</Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}

                          {filteredFriends.length > 0 ? filteredFriends.map((friend) => (
                            <View key={friend.id} style={styles.friendRow}>
                              <View style={styles.friendAvatar}>
                                <Text style={styles.friendAvatarText}>{friend.avatar}</Text>
                              </View>
                              <View style={styles.friendMeta}>
                                <Text style={styles.friendName}>{friend.name}</Text>
                                <Text style={styles.friendDetail}>
                                  {friend.location} · {friend.xp} XP · {friend.streak}🔥
                                </Text>
                              </View>
                            </View>
                          )) : (
                            <Text style={styles.sectionCopy}>
                              {search ? "No friends match that search." : "No friends added yet — try a suggestion below."}
                            </Text>
                          )}
                        </View>

                        <View style={styles.panel}>
                          <Text style={styles.sectionTitle}>Suggested for you</Text>
                          <Text style={styles.sectionCopy}>People learning Urdu in your network.</Text>
                          {filteredSuggestions.length > 0 ? filteredSuggestions.map((suggestion) => (
                            <View key={suggestion.id} style={styles.friendRow}>
                              <View style={styles.friendAvatar}>
                                <Text style={styles.friendAvatarText}>{suggestion.avatar}</Text>
                              </View>
                              <View style={styles.friendMeta}>
                                <Text style={styles.friendName}>{suggestion.name}</Text>
                                <Text style={styles.friendDetail}>
                                  {suggestion.level} · {suggestion.mutual} mutual {suggestion.mutual === 1 ? "friend" : "friends"}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setFriendIdInput(suggestion.id);
                                  setShowFriendIdAdd(true);
                                  selectionHaptic();
                                  setFriendLookupMessage(`Tap "Add friend" to add ${suggestion.name}`);
                                }}
                                style={({ pressed }) => [
                                  styles.friendAddChip,
                                  pressed ? styles.friendAddChipPressed : undefined,
                                ]}
                              >
                                <Text style={styles.friendAddChipLabel}>Add</Text>
                              </Pressable>
                            </View>
                          )) : (
                            <Text style={styles.sectionCopy}>No suggestions match that search.</Text>
                          )}
                        </View>
                      </>
                    );
                  })()
                ) : mainView === "profile" ? (
                  <>
                    <View style={styles.profileHeroCard}>
                      <View style={styles.profileHeroAvatar}>
                        <Text style={styles.profileHeroAvatarText}>{progress.avatar ?? "🐱"}</Text>
                      </View>
                      <Text style={styles.profileHeroName}>{progress.userName}</Text>
                      <Text style={styles.profileHeroMeta}>
                        {progress.level ?? "Beginner"} · {progress.goal ?? "Build confidence"}
                      </Text>
                      <Text style={styles.profileHeroId}>Player ID · {progress.playerId}</Text>
                    </View>

                    <View style={styles.profileStatsRow}>
                      <View style={[styles.profileStatChip, styles.profileStatChipFire]}>
                        <Text style={styles.profileStatIcon}>🔥</Text>
                        <Text style={styles.profileStatValue}>{progress.streak}</Text>
                        <Text style={styles.profileStatLabel}>Day streak</Text>
                      </View>
                      <View style={[styles.profileStatChip, styles.profileStatChipAura]}>
                        <Text style={styles.profileStatIcon}>⚡</Text>
                        <Text style={styles.profileStatValue}>{progress.xp}</Text>
                        <Text style={styles.profileStatLabel}>Total XP</Text>
                      </View>
                      <View style={[styles.profileStatChip, styles.profileStatChipHeart]}>
                        <Text style={styles.profileStatIcon}>❤️</Text>
                        <Text style={styles.profileStatValue}>{progress.hearts}</Text>
                        <Text style={styles.profileStatLabel}>Hearts</Text>
                      </View>
                    </View>

                    <View style={styles.panel}>
                      <Text style={styles.sectionTitle}>Achievements</Text>
                      <Text style={styles.sectionCopy}>Unlock badges as you build your streak and master units.</Text>
                      <View style={styles.achievementGrid}>
                        {[
                          { emoji: "👣", label: "First Steps", unlocked: progress.completedLessons.length > 0, hint: "Complete your first lesson" },
                          { emoji: "🔥", label: "Streak Starter", unlocked: progress.streak >= 3, hint: "Reach a 3-day streak" },
                          { emoji: "📚", label: "Bookworm", unlocked: progress.completedLessons.length >= 5, hint: "Finish 5 lessons" },
                          { emoji: "⚡", label: "XP Climber", unlocked: progress.xp >= 100, hint: "Earn 100 XP" },
                          { emoji: "🏆", label: "Marathon", unlocked: progress.streak >= 7, hint: "Reach a 7-day streak" },
                          { emoji: "🤝", label: "Friend Magnet", unlocked: progress.friends.length >= 3, hint: "Add 3 friends" },
                          { emoji: "🎯", label: "Sharpshooter", unlocked: progress.placement?.score === progress.placement?.total && progress.placement !== null, hint: "Ace the placement test" },
                          { emoji: "🌟", label: "Aura Master", unlocked: progress.xp >= 500, hint: "Earn 500 XP" },
                        ].map((badge) => (
                          <View
                            key={badge.label}
                            style={[
                              styles.achievementBadge,
                              !badge.unlocked ? styles.achievementBadgeLocked : undefined,
                            ]}
                          >
                            <Text style={[styles.achievementEmoji, !badge.unlocked ? styles.achievementEmojiLocked : undefined]}>
                              {badge.unlocked ? badge.emoji : "🔒"}
                            </Text>
                            <Text style={[styles.achievementLabel, !badge.unlocked ? styles.achievementLabelLocked : undefined]}>
                              {badge.label}
                            </Text>
                            <Text style={styles.achievementHint}>{badge.hint}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.panel}>
                      <Text style={styles.sectionTitle}>Settings</Text>
                      <Pressable
                        onPress={openProfileEditor}
                        style={({ pressed }) => [
                          styles.profileAction,
                          pressed ? styles.profileActionPressed : undefined,
                        ]}
                      >
                        <Text style={styles.profileActionLabel}>Edit profile</Text>
                        <Text style={styles.profileActionChevron}>›</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          tapHaptic();
                          void retakePlacement();
                        }}
                        style={({ pressed }) => [
                          styles.profileAction,
                          pressed ? styles.profileActionPressed : undefined,
                        ]}
                      >
                        <Text style={styles.profileActionLabel}>Retake placement test</Text>
                        <Text style={styles.profileActionChevron}>›</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleLogout}
                        style={({ pressed }) => [
                          styles.profileAction,
                          pressed ? styles.profileActionPressed : undefined,
                        ]}
                      >
                        <Text style={[styles.profileActionLabel, styles.profileActionDanger]}>Log out</Text>
                        <Text style={[styles.profileActionChevron, styles.profileActionDanger]}>›</Text>
                      </Pressable>
                    </View>
                  </>
                ) : mainView === "editProfile" ? (
                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Edit your profile</Text>
                    <Text style={styles.sectionCopy}>
                      Update your name, goal, level, and avatar.
                    </Text>
                    <View style={styles.friendIdCard}>
                      <Text style={styles.friendIdLabel}>Your player ID</Text>
                      <Text style={styles.friendIdValue}>{progress.playerId}</Text>
                    </View>

                    <View style={styles.formBlock}>
                      <Text style={styles.fieldLabel}>Your name</Text>
                      <TextInput
                        placeholder="Enter your name"
                        placeholderTextColor={theme.colors.muted}
                        value={nameInput}
                        onChangeText={setNameInput}
                        style={styles.input}
                      />
                    </View>

                    <View style={styles.formBlock}>
                      <Text style={styles.fieldLabel}>Your goal</Text>
                      <View style={styles.optionGrid}>
                        {GOALS.map((goal) => (
                          <Pressable
                            key={goal}
                            onPress={() => setSelectedGoal(goal)}
                            style={({ pressed }) => [
                              styles.optionChip,
                              selectedGoal === goal ? styles.optionChipActive : undefined,
                              pressed ? styles.optionChipPressed : undefined,
                            ]}
                          >
                            <Text style={[
                              styles.optionChipLabel,
                              selectedGoal === goal ? styles.optionChipLabelActive : undefined,
                            ]}>
                              {goal}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={styles.formBlock}>
                      <Text style={styles.fieldLabel}>Current level</Text>
                      <View style={styles.levelRow}>
                        {LEVELS.map((level) => (
                          <Pressable
                            key={level}
                            onPress={() => {
                              setSelectedLevel(level);
                              setSelectedAvatar(avatarOptions[level][0]);
                            }}
                            style={({ pressed }) => [
                              styles.levelPill,
                              selectedLevel === level ? styles.levelPillActive : undefined,
                              pressed ? styles.optionChipPressed : undefined,
                            ]}
                          >
                            <Text style={[
                              styles.levelPillLabel,
                              selectedLevel === level ? styles.optionChipLabelActive : undefined,
                            ]}>
                              {level}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {selectedLevel ? (
                      <View style={styles.formBlock}>
                        <Text style={styles.fieldLabel}>Choose a profile picture</Text>
                        <View style={styles.avatarPickerRow}>
                          {avatarOptions[selectedLevel].map((avatar) => (
                            <Pressable
                              key={avatar}
                              onPress={() => setSelectedAvatar(avatar)}
                              style={({ pressed }) => [
                                styles.avatarChoice,
                                selectedAvatar === avatar ? styles.avatarChoiceActive : undefined,
                                pressed ? styles.optionChipPressed : undefined,
                              ]}
                            >
                              <Text style={styles.avatarChoiceText}>{avatar}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={saveEditedProfile}
                      disabled={!selectedGoal || !selectedLevel}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        !selectedGoal || !selectedLevel ? styles.disabledButton : undefined,
                        pressed && selectedGoal && selectedLevel ? styles.primaryButtonPressed : undefined,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>Save profile</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapHaptic();
                        void retakePlacement();
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed ? styles.secondaryButtonPressed : undefined,
                      ]}
                    >
                      <Text style={styles.secondaryButtonLabel}>
                        {progress.placement ? "Retake placement test" : "Take placement test"}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                <View style={styles.lessonList}>
                  <Text style={styles.sectionTitle}>Course path</Text>
                  <Text style={styles.sectionCopy}>20 units | 5 lessons each | every lesson ends in a quiz checkpoint</Text>
                  {units.map((unit, unitIndex) => (
                    <View key={unit.id} style={styles.unitPanel}>
                      <View style={styles.unitHeader}>
                        <View style={styles.unitHeaderText}>
                          <Text style={styles.unitTitle}>Unit {unit.order}: {unit.title}</Text>
                          <Text style={styles.unitCopy}>{unit.description}</Text>
                        </View>
                        <View style={[styles.unitBadge, { backgroundColor: unit.accent }]}>
                          <Text style={styles.unitBadgeText}>{unit.lessons.length}</Text>
                          <Text style={styles.unitBadgeLabel}>Lessons</Text>
                        </View>
                      </View>
                      {!isUnitUnlocked(unitIndex) && (
                        <Text style={styles.lockedNote}>Finish the previous unit to unlock this one.</Text>
                      )}
                      <View style={styles.boardTrack}>
                        {unit.lessons.map((lesson, lessonIndex) => {
                          const completed = progress.completedLessons.includes(lesson.id);
                          const unlocked = isLessonUnlocked(unitIndex, lessonIndex);
                          const lane = BOARD_LANES[unitIndex % 2][lessonIndex % BOARD_LANES[0].length];
                          const prevLane = lessonIndex > 0
                            ? BOARD_LANES[unitIndex % 2][(lessonIndex - 1) % BOARD_LANES[0].length]
                            : lane;
                          const direction = lessonIndex === 0
                            ? "straight"
                            : prevLane === lane
                              ? "straight"
                              : prevLane === "flex-start" && lane === "flex-end"
                                ? "leftToRight"
                                : prevLane === "flex-end" && lane === "flex-start"
                                  ? "rightToLeft"
                                  : "straight";

                          return (
                            <View key={lesson.id} style={[styles.boardStep, { alignItems: lane }]}>
                              {lessonIndex > 0 ? (
                                <BoardConnector
                                  direction={direction}
                                  color={unit.accent}
                                  unlocked={unlocked}
                                  height={62}
                                />
                              ) : null}
                              <Pressable
                                disabled={!unlocked}
                                onPress={() => {
                                  tapHaptic();
                                  setPreviewLessonId(lesson.id);
                                }}
                                style={({ pressed }) => [
                                  styles.boardNodeShell,
                                  pressed && unlocked ? styles.boardNodeShellPressed : undefined,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.boardNode,
                                    completed ? styles.boardNodeDone : undefined,
                                    !unlocked ? styles.boardNodeLocked : undefined,
                                    !completed && unlocked ? { backgroundColor: lesson.accent } : undefined,
                                  ]}
                                >
                                  <Text style={styles.boardNodeEmoji}>
                                    {completed ? "★" : unlocked ? "●" : "🔒"}
                                  </Text>
                                  <Text style={styles.boardNodeLabel}>{lesson.order}</Text>
                                </View>
                              </Pressable>
                              <Pressable
                                disabled={!unlocked}
                                onPress={() => {
                                  tapHaptic();
                                  setPreviewLessonId(lesson.id);
                                }}
                                style={({ pressed }) => [
                                  styles.boardInfoCard,
                                  completed ? styles.boardInfoCardDone : undefined,
                                  !unlocked ? styles.boardInfoCardLocked : undefined,
                                  pressed && unlocked ? styles.boardInfoCardPressed : undefined,
                                ]}
                              >
                                <Text numberOfLines={2} style={styles.boardInfoTitle}>
                                  {lesson.title}
                                </Text>
                                <Text style={styles.boardInfoMeta}>
                                  {completed ? "Completed" : unlocked ? `${lesson.questions.length} question quiz` : "Locked"}
                                </Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
                  </>
                )}
              </>
            )}

            {session && currentQuestion && !sessionFinished && (
              <View style={styles.lessonShell}>
                <View style={styles.lessonHeader}>
                  <View style={styles.lessonProgressTrack}>
                    <View
                      style={[
                        styles.lessonProgressFill,
                        {
                          width: `${Math.min(100, ((session.currentIndex + 1) / Math.max(1, session.questions.length)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.lessonHeartsBadge}>
                    <Text style={styles.lessonHeartsIcon}>❤️</Text>
                    <Text style={styles.lessonHeartsValue}>{progress.hearts}</Text>
                  </View>
                </View>
                <Text style={styles.lessonEyebrow}>
                  {session.mode === "review" ? "Review" : "Lesson"} · {session.currentIndex + 1} of {session.questions.length}
                </Text>
                <Text style={styles.lessonQuestion}>{currentQuestion.promptEn}</Text>
                {currentQuestion.helperText ? (
                  <Text style={styles.lessonHelper}>{currentQuestion.helperText}</Text>
                ) : (
                  <Text style={styles.lessonHelper}>Tap the matching Urdu phrase.</Text>
                )}
                <Pressable
                  onPress={() => void playPromptAudio(currentQuestion.audioText)}
                  style={({ pressed }) => [
                    styles.lessonAudioButton,
                    pressed ? styles.lessonAudioButtonPressed : undefined,
                  ]}
                >
                  <Text style={styles.lessonAudioIcon}>🔊</Text>
                  <Text style={styles.lessonAudioLabel}>Play Urdu audio</Text>
                </Pressable>

                {currentQuestion.type === "buildSentence" ? (
                  <View style={styles.builderWrap}>
                    <Text style={styles.speakingTarget}>{formatUrduAnswer(currentQuestion.answerUr)}</Text>
                    <Text style={styles.helper}>Tap the tiles to build the full Roman Urdu sentence.</Text>
                    <View style={styles.builderAnswerRow}>
                      {selectedBuilderIndices.length > 0 ? selectedBuilderIndices.map((wordIndex, wordPosition) => (
                        <Pressable
                          key={`${currentQuestion.id}-selected-${wordIndex}-${wordPosition}`}
                          onPress={() => removeBuilderWord(wordPosition)}
                          style={({ pressed }) => [
                            styles.builderSelectedChip,
                            pressed ? styles.builderSelectedChipPressed : undefined,
                          ]}
                        >
                          <Text style={styles.builderSelectedChipText}>{currentQuestion.wordBank?.[wordIndex]}</Text>
                        </Pressable>
                      )) : (
                        <View style={styles.builderPlaceholder}>
                          <Text style={styles.builderPlaceholderText}>Your sentence builds here</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.builderWordBank}>
                      {(currentQuestion.wordBank ?? [])
                        .map((word, wordIndex) => ({ word, wordIndex }))
                        .filter(({ wordIndex }) => !selectedBuilderIndices.includes(wordIndex))
                        .map(({ word, wordIndex }) => (
                          <Pressable
                            key={`${currentQuestion.id}-word-${wordIndex}`}
                            onPress={() => addBuilderWord(wordIndex)}
                            style={({ pressed }) => [
                              styles.builderWordChip,
                              pressed ? styles.builderWordChipPressed : undefined,
                            ]}
                          >
                            <Text style={styles.builderWordChipText}>{word}</Text>
                          </Pressable>
                        ))}
                    </View>
                    <Pressable
                      onPress={() => setSelectedBuilderIndices([])}
                      style={styles.textButton}
                    >
                      <Text style={styles.textButtonLabel}>Clear sentence</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        selectionHaptic();
                        const builtAnswer = selectedBuilderIndices
                          .map((wordIndex) => currentQuestion.wordBank?.[wordIndex] ?? "")
                          .join(" ")
                          .trim();
                        void submitAnswer(builtAnswer);
                      }}
                      disabled={selectedBuilderIndices.length === 0}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        selectedBuilderIndices.length === 0 ? styles.disabledButton : undefined,
                        pressed && selectedBuilderIndices.length > 0 ? styles.primaryButtonPressed : undefined,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>Check my sentence</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.choiceList}>
                    {(currentQuestion.choices ?? []).map((choice) => (
                      <ChoiceButton
                        key={choice}
                        label={romanToUrdu(choice)}
                        detail={choice}
                        onPress={() => void submitAnswer(choice)}
                      />
                    ))}
                  </View>
                )}

                {feedback && (
                  <Animated.View
                    style={[
                      styles.feedbackCard,
                      feedback.wasCorrect ? styles.feedbackGood : styles.feedbackBad,
                      {
                        opacity: feedbackAnim,
                        transform: [
                          {
                            translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                          },
                          {
                            scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.feedbackTitle}>
                      {feedback.wasCorrect ? "✓ " : "✗ "}{feedback.message}
                    </Text>
                    <Text style={styles.feedbackCopy}>{feedback.tip}</Text>
                    {!feedback.wasCorrect ? (
                      <Text style={styles.feedbackAnswer}>Correct answer: {formatUrduAnswer(feedback.correctAnswer)}</Text>
                    ) : null}
                  </Animated.View>
                )}
              </View>
            )}

            {session && (sessionFinished || (!currentQuestion && session.questions.length === 0)) && (
              <View style={styles.lessonCompleteCard}>
                <Text style={styles.lessonCompleteEmoji}>
                  {session.questions.length === 0
                    ? "🎯"
                    : session.correctAnswers === session.questions.length
                    ? "🏆"
                    : session.correctAnswers >= Math.ceil(session.questions.length * 0.6)
                    ? "🌟"
                    : "💪"}
                </Text>
                <Text style={styles.lessonCompleteTitle}>
                  {session.questions.length === 0 ? "Review cleared" : "Lesson complete"}
                </Text>
                <Text style={styles.lessonCompleteScore}>
                  {session.questions.length === 0
                    ? "Your review queue is empty for now."
                    : `${session.correctAnswers} / ${session.questions.length} correct`}
                </Text>
                {session.questions.length > 0 ? (
                  <View style={styles.lessonCompleteMeterTrack}>
                    <View
                      style={[
                        styles.lessonCompleteMeterFill,
                        { width: `${(session.correctAnswers / Math.max(1, session.questions.length)) * 100}%` },
                      ]}
                    />
                  </View>
                ) : null}
                <View style={styles.lessonCompleteStatsRow}>
                  <View style={styles.lessonCompleteStat}>
                    <Text style={styles.lessonCompleteStatIcon}>⚡</Text>
                    <Text style={styles.lessonCompleteStatValue}>+{session.correctAnswers * session.xpPerCorrect}</Text>
                    <Text style={styles.lessonCompleteStatLabel}>XP earned</Text>
                  </View>
                  <View style={styles.lessonCompleteStat}>
                    <Text style={styles.lessonCompleteStatIcon}>❤️</Text>
                    <Text style={styles.lessonCompleteStatValue}>{progress.hearts}</Text>
                    <Text style={styles.lessonCompleteStatLabel}>Hearts left</Text>
                  </View>
                  <View style={styles.lessonCompleteStat}>
                    <Text style={styles.lessonCompleteStatIcon}>🔥</Text>
                    <Text style={styles.lessonCompleteStatValue}>{progress.streak}</Text>
                    <Text style={styles.lessonCompleteStatLabel}>Streak</Text>
                  </View>
                </View>
                {feedback && !feedback.wasCorrect ? (
                  <Text style={styles.lessonCompleteHint}>
                    Last answer: {formatUrduAnswer(feedback.correctAnswer)}
                  </Text>
                ) : null}
                <Pressable onPress={resetSession} style={({ pressed }) => [
                  styles.primaryButton,
                  styles.primaryButtonAura,
                  pressed ? styles.primaryButtonAuraPressed : undefined,
                ]}>
                  <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelDark]}>Continue learning</Text>
                </Pressable>
              </View>
            )}
            {session && (
              <Pressable onPress={resetSession} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Back to lessons</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
      {appStage === "main" && !session && !previewLesson ? (
        <BottomNav active={activeBottomTab} onChange={handleBottomTabChange} />
      ) : null}
      </AuroraBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
  },
  appBackdrop: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 4,
    ...theme.shadows.lift,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  modalProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.brandSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: 26,
  },
  modalProfileName: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: theme.weights.extrabold,
  },
  modalProfileMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: theme.weights.semibold,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalItemPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  modalItemLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.bold,
    fontSize: 16,
  },
  modalItemDanger: {
    color: theme.colors.danger,
  },
  modalChevron: {
    color: theme.colors.muted,
    fontSize: 20,
    fontWeight: theme.weights.bold,
  },
  loadingBackdrop: {
    flex: 1,
  },
  loadingTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
    textAlign: "center",
  },
  placementCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    ...theme.shadows.soft,
  },
  placementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placementCounter: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  placementCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted,
  },
  placementProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  placementProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.brand,
    borderRadius: 999,
  },
  placementChoice: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
    ...theme.shadows.soft,
  },
  placementChoicePressed: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brandTint,
  },
  placementChoiceCorrect: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  placementChoiceMuted: {
    opacity: 0.55,
  },
  placementChoiceLabel: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: theme.weights.bold,
  },
  placementChoiceUrdu: {
    color: theme.colors.ink,
    fontSize: 22,
    lineHeight: 34,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: theme.fonts.urdu,
  },
  placementChoiceRoman: {
    color: theme.colors.brandDark,
    fontSize: 14,
    fontWeight: theme.weights.semibold,
    textAlign: "right",
  },
  placementResultsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    ...theme.shadows.lift,
  },
  placementMeterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  placementMeterTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  placementMeterFill: {
    height: "100%",
    backgroundColor: theme.colors.brand,
    borderRadius: 999,
  },
  placementMeterValue: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.display,
    fontSize: 16,
    minWidth: 44,
    textAlign: "right",
  },
  placementResultBlock: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 16,
    gap: 4,
  },
  placementResultLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: theme.weights.extrabold,
  },
  placementResultValue: {
    color: theme.colors.brandDark,
    fontSize: 22,
    fontWeight: theme.weights.display,
  },
  placementResultHint: {
    color: theme.colors.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  placementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.brandSoft,
    borderWidth: 1,
    borderColor: theme.colors.brandTint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  placementChipLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  onboardingWrap: {
    gap: 18,
    alignItems: "center",
    paddingTop: 20,
    width: "100%",
  },
  landingWrap: {
    alignItems: "center",
    gap: 18,
    width: "100%",
    paddingTop: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  topBarLeft: {
    minWidth: 82,
  },
  topBarSpacer: {
    width: 82,
  },
  topBarBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-end",
    minWidth: 0,
    alignSelf: "flex-end",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
  },
  topBarBrandPressed: {
    backgroundColor: theme.colors.surface,
  },
  profileMenuWrap: {
    alignItems: "flex-end",
    minWidth: 0,
    flex: 1,
  },
  navChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navChipPressed: {
    backgroundColor: theme.colors.surface,
  },
  navChipLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
  },
  topProfileName: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
    flexShrink: 1,
    textAlign: "right",
  },
  topProfileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: theme.colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  topProfileAvatarText: {
    fontSize: 22,
  },
  profileDropdown: {
    marginTop: 10,
    minWidth: 176,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  profileDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profileDropdownItemPressed: {
    backgroundColor: theme.colors.surface,
  },
  profileDropdownLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
  },
  profileDropdownDanger: {
    color: theme.colors.danger,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 22,
  },
  hero: {
    backgroundColor: theme.colors.cardElevated,
    borderRadius: 32,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    width: "100%",
    ...theme.shadows.soft,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroLogo: {
    width: 124,
    height: 124,
    borderRadius: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  landingLogo: {
    width: 180,
    height: 180,
    borderRadius: 40,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroMiniLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  brand: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: -6,
    textAlign: "center",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1,
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.muted,
  },
  progressDeck: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  leaderboardCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  leaderboardRank: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  streakRank: {
    backgroundColor: "#88bc72",
  },
  leaderboardRankText: {
    color: theme.colors.card,
    fontWeight: theme.weights.extrabold,
  },
  leaderboardMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  leaderboardName: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
    fontSize: 15,
  },
  leaderboardDetail: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  leaderboardScore: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 14,
  },
  sideWidgets: {
    width: 108,
    gap: 12,
  },
  practicePortal: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 96,
  },
  practicePortalPressed: {
    backgroundColor: theme.colors.surface,
  },
  practicePortalIcon: {
    fontSize: 26,
  },
  practicePortalLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
    textAlign: "center",
  },
  heartJarCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 132,
  },
  heartJarCounter: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.brandDark,
    alignItems: "center",
  },
  heartJarCounterText: {
    color: theme.colors.card,
    fontWeight: theme.weights.extrabold,
    fontSize: 14,
  },
  heartJarLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  heartJarBody: {
    width: 62,
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  heartJarHearts: {
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
  },
  sectionCopy: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.muted,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.brandDark,
  },
  disabledButton: {
    backgroundColor: "#9db8ae",
  },
  secondaryButton: {
    marginTop: 4,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 16,
  },
  primaryButtonLabel: {
    color: theme.colors.card,
    fontWeight: theme.weights.extrabold,
    fontSize: 16,
  },
  textButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
  },
  lessonList: {
    gap: 16,
  },
  unitPanel: {
    backgroundColor: theme.colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 16,
  },
  unitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  unitHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  unitTitle: {
    fontSize: 18,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
    flexShrink: 1,
  },
  unitCopy: {
    color: theme.colors.muted,
    marginTop: 4,
    lineHeight: 20,
    flexShrink: 1,
  },
  unitBadge: {
    minWidth: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 2,
    alignSelf: "flex-start",
  },
  unitBadgeText: {
    color: theme.colors.card,
    fontWeight: theme.weights.extrabold,
    fontSize: 18,
    lineHeight: 20,
  },
  unitBadgeLabel: {
    color: theme.colors.card,
    fontSize: 10,
    fontWeight: theme.weights.extrabold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  returningCard: {
    backgroundColor: "#f3fbf6",
    borderWidth: 1,
    borderColor: "#c8e8d5",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  returningTitle: {
    fontSize: 14,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.brandDark,
    textTransform: "uppercase",
  },
  returningCopy: {
    fontSize: 22,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  returningProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  returningMeta: {
    color: theme.colors.muted,
    lineHeight: 21,
    flexShrink: 1,
  },
  profileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  avatarBadgeText: {
    fontSize: 24,
  },
  avatarPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  avatarChoice: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarChoiceActive: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brand,
    borderWidth: 2,
  },
  avatarChoiceText: {
    fontSize: 28,
  },
  lockedNote: {
    color: theme.colors.danger,
    fontWeight: theme.weights.bold,
  },
  boardTrack: {
    gap: 4,
    paddingTop: 4,
  },
  boardStep: {
    width: "100%",
    gap: 8,
  },
  boardConnector: {
    width: 8,
    height: 30,
    borderRadius: 999,
    marginBottom: -2,
    opacity: 0.42,
  },
  boardNodeShell: {
    borderRadius: 999,
  },
  boardNodeShellPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  boardNode: {
    width: 82,
    height: 82,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: theme.colors.card,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  boardNodeDone: {
    backgroundColor: theme.colors.brandDark,
    borderColor: "#d7f0e4",
  },
  boardNodeLocked: {
    backgroundColor: "#c7d6ce",
    borderColor: "#e8f1ec",
  },
  boardNodeEmoji: {
    fontSize: 22,
    lineHeight: 24,
  },
  boardNodeLabel: {
    marginTop: 2,
    color: theme.colors.card,
    fontWeight: theme.weights.display,
    fontSize: 20,
    lineHeight: 22,
  },
  boardInfoCard: {
    width: "74%",
    maxWidth: 220,
    minWidth: 150,
    backgroundColor: "#f6fbf8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  boardInfoCardPressed: {
    backgroundColor: theme.colors.surface,
  },
  boardInfoCardDone: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderStrong,
  },
  boardInfoCardLocked: {
    backgroundColor: "#f1f5f2",
    borderColor: "#e1e9e4",
  },
  boardInfoTitle: {
    fontSize: 15,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  boardInfoMeta: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: theme.weights.bold,
  },
  flashcardPreview: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  flashcardPrompt: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  flashcardAnswer: {
    fontSize: 15,
    color: theme.colors.brandDark,
    fontWeight: theme.weights.bold,
    lineHeight: 22,
  },
  flashcardMeta: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: theme.weights.bold,
  },
  flashcardEmpty: {
    backgroundColor: "#f5faf7",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  flashcardEmptyTitle: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  friendIdCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  friendIdLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: theme.weights.extrabold,
  },
  friendIdValue: {
    color: theme.colors.brandDark,
    fontSize: 20,
    fontWeight: theme.weights.extrabold,
  },
  friendMessageCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 16,
    padding: 12,
  },
  friendMessageText: {
    color: theme.colors.ink,
    fontWeight: theme.weights.bold,
    lineHeight: 20,
  },
  podiumWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    paddingTop: 6,
    paddingBottom: 10,
  },
  podiumLane: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  podiumLaneCenter: {
    marginBottom: 0,
  },
  podiumLaneSide: {
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: "#cfe7d8",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumAvatarWinner: {
    width: 62,
    height: 62,
    backgroundColor: "#f4fbdd",
    borderColor: "#d7e79c",
  },
  podiumAvatarText: {
    fontSize: 26,
  },
  podiumName: {
    fontSize: 12,
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
    textAlign: "center",
    minHeight: 32,
  },
  podiumBlock: {
    width: "100%",
    maxWidth: 92,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  podiumBlockFirst: {
    height: 110,
    backgroundColor: theme.colors.brand,
  },
  podiumBlockSecond: {
    height: 82,
    backgroundColor: "#7abf9a",
  },
  podiumBlockThird: {
    height: 64,
    backgroundColor: "#a5d3ba",
  },
  podiumPlace: {
    color: theme.colors.card,
    fontWeight: theme.weights.display,
    fontSize: 24,
    lineHeight: 28,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  filterChip: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brand,
  },
  filterChipLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  filterChipLabelActive: {
    color: theme.colors.brandDark,
  },
  rankSection: {
    gap: 10,
    paddingTop: 4,
  },
  rankSectionTitle: {
    fontSize: 18,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  rankSectionCopy: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rankCardYou: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: "#beddca",
  },
  rankMedal: {
    fontSize: 24,
  },
  rankMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rankName: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
    fontSize: 15,
  },
  rankDetail: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  rankScore: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 14,
  },
  formBlock: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.ink,
  },
  optionGrid: {
    gap: 10,
  },
  optionChip: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionChipActive: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brand,
  },
  optionChipPressed: {
    opacity: 0.88,
  },
  optionChipLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.bold,
  },
  optionChipLabelActive: {
    color: theme.colors.brandDark,
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  levelPill: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  levelPillActive: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brand,
  },
  levelPillLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.extrabold,
  },
  progressText: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.bold,
    fontSize: 14,
  },
  question: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
  },
  helper: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  choiceList: {
    gap: 12,
  },
  audioButton: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f6ef",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  audioButtonPressed: {
    backgroundColor: "#d8eee3",
  },
  audioButtonLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
  },
  builderWrap: {
    gap: 12,
  },
  builderAnswerRow: {
    minHeight: 68,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  builderPlaceholder: {
    minHeight: 40,
    justifyContent: "center",
  },
  builderPlaceholderText: {
    color: theme.colors.muted,
    fontWeight: theme.weights.bold,
  },
  builderWordBank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  builderWordChip: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  builderWordChipPressed: {
    backgroundColor: theme.colors.surface,
  },
  builderWordChipText: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 15,
  },
  builderSelectedChip: {
    backgroundColor: theme.colors.brandSoft,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  builderSelectedChipPressed: {
    backgroundColor: "#def1e6",
  },
  builderSelectedChipText: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 15,
  },
  speakingTarget: {
    color: theme.colors.ink,
    lineHeight: 38,
    fontSize: 24,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: theme.fonts.urduBold,
    flexShrink: 1,
  },
  previewPhraseCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  previewEnglish: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  previewRoman: {
    fontSize: 16,
    color: theme.colors.brandDark,
    fontWeight: theme.weights.bold,
  },
  previewUrdu: {
    fontSize: 24,
    lineHeight: 38,
    color: theme.colors.ink,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: theme.fonts.urdu,
  },
  feedbackCard: {
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 6,
  },
  feedbackGood: {
    backgroundColor: "#e7f7ee",
  },
  feedbackBad: {
    backgroundColor: "#f8ece7",
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
  },
  feedbackCopy: {
    color: theme.colors.muted,
    lineHeight: 21,
  },
  feedbackAnswer: {
    color: theme.colors.ink,
    fontWeight: theme.weights.bold,
    lineHeight: 24,
  },
  safeAreaDark: {
    backgroundColor: theme.colors.bgEmerald,
  },
  onDarkText: {
    color: theme.colors.inkOnDark,
  },
  onDarkTextSoft: {
    color: theme.colors.inkOnDarkSoft,
  },
  brandOnDark: {
    color: theme.colors.inkOnDark,
    fontFamily: theme.fonts.serif,
  },
  taglineOnDark: {
    color: theme.colors.inkOnDarkSoft,
  },
  primaryButtonAura: {
    backgroundColor: theme.colors.aura,
    ...theme.shadows.glow,
  },
  primaryButtonAuraPressed: {
    backgroundColor: theme.colors.auraDeep,
  },
  primaryButtonLabelDark: {
    color: theme.colors.bgEmerald,
  },
  navChipDark: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  navChipDarkPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  eyebrowOnDark: {
    color: theme.colors.aura,
  },
  returningCardStandalone: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    ...theme.shadows.lift,
  },
  returningHint: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  wizardHeader: {
    gap: 8,
    marginBottom: 4,
  },
  wizardEyebrow: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  wizardProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  wizardProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.aura,
    borderRadius: 999,
  },
  wizardStep: {
    gap: 12,
  },
  wizardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
  },
  wizardHelper: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.muted,
  },
  wizardOption: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  wizardOptionActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandSoft,
  },
  wizardOptionPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  wizardOptionLabel: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: theme.weights.extrabold,
  },
  wizardOptionLabelActive: {
    color: theme.colors.brandDark,
  },
  wizardOptionDetail: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  levelStack: {
    gap: 10,
  },
  profileHeroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 22,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    ...theme.shadows.lift,
  },
  profileHeroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: theme.colors.brandSoft,
    borderWidth: 3,
    borderColor: theme.colors.aura,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  profileHeroAvatarText: {
    fontSize: 44,
  },
  profileHeroName: {
    fontSize: 22,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    textAlign: "center",
  },
  profileHeroMeta: {
    fontSize: 14,
    color: theme.colors.brandDark,
    fontWeight: theme.weights.bold,
    textAlign: "center",
  },
  profileHeroId: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: theme.weights.semibold,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  profileStatsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  profileStatChip: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  profileStatChipFire: {
    backgroundColor: theme.colors.fireSoft,
    borderColor: theme.colors.fire,
  },
  profileStatChipAura: {
    backgroundColor: theme.colors.auraSoft,
    borderColor: theme.colors.auraDeep,
  },
  profileStatChipHeart: {
    backgroundColor: theme.colors.heartSoft,
    borderColor: theme.colors.heart,
  },
  profileStatIcon: {
    fontSize: 20,
  },
  profileStatValue: {
    fontSize: 22,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
  },
  profileStatLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: theme.weights.bold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  achievementBadge: {
    width: "47%",
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.brandTint,
  },
  achievementBadgeLocked: {
    backgroundColor: theme.colors.lockedSurface,
    borderColor: theme.colors.border,
    opacity: 0.7,
  },
  achievementEmoji: {
    fontSize: 28,
  },
  achievementEmojiLocked: {
    opacity: 0.5,
  },
  achievementLabel: {
    fontSize: 13,
    fontWeight: theme.weights.extrabold,
    color: theme.colors.ink,
    textAlign: "center",
  },
  achievementLabelLocked: {
    color: theme.colors.muted,
  },
  achievementHint: {
    fontSize: 10,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 14,
  },
  profileAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileActionPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  profileActionLabel: {
    color: theme.colors.ink,
    fontWeight: theme.weights.bold,
    fontSize: 15,
  },
  profileActionChevron: {
    color: theme.colors.muted,
    fontSize: 22,
    fontWeight: theme.weights.bold,
  },
  profileActionDanger: {
    color: theme.colors.danger,
  },
  friendsSearchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
    width: "100%",
    ...theme.shadows.soft,
  },
  friendsSearchIcon: {
    fontSize: 16,
  },
  friendsSearchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.ink,
    paddingVertical: 8,
  },
  friendSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  friendIdToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.brandSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.brandTint,
  },
  friendIdTogglePressed: {
    backgroundColor: theme.colors.brandTint,
  },
  friendIdToggleLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  friendIdAddBlock: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.brandSoft,
    borderWidth: 1,
    borderColor: theme.colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarText: {
    fontSize: 22,
  },
  friendMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  friendName: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: theme.weights.extrabold,
  },
  friendDetail: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  friendAddChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.aura,
    borderRadius: 999,
    ...theme.shadows.glow,
  },
  friendAddChipPressed: {
    backgroundColor: theme.colors.auraDeep,
  },
  friendAddChipLabel: {
    color: theme.colors.bgEmerald,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  lessonShell: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    ...theme.shadows.lift,
  },
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lessonProgressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  lessonProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.aura,
    borderRadius: 999,
  },
  lessonHeartsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.heartSoft,
    borderWidth: 1,
    borderColor: theme.colors.heart,
  },
  lessonHeartsIcon: {
    fontSize: 14,
  },
  lessonHeartsValue: {
    color: theme.colors.heart,
    fontWeight: theme.weights.extrabold,
    fontSize: 13,
  },
  lessonEyebrow: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  lessonQuestion: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    fontFamily: theme.fonts.serif,
  },
  lessonHelper: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.muted,
  },
  lessonAudioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.brandTint,
  },
  lessonAudioButtonPressed: {
    backgroundColor: theme.colors.brandTint,
  },
  lessonAudioIcon: {
    fontSize: 18,
  },
  lessonAudioLabel: {
    color: theme.colors.brandDark,
    fontWeight: theme.weights.extrabold,
    fontSize: 15,
  },
  lessonCompleteCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    alignItems: "center",
    ...theme.shadows.lift,
  },
  lessonCompleteEmoji: {
    fontSize: 64,
  },
  lessonCompleteTitle: {
    fontSize: 26,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    textAlign: "center",
    fontFamily: theme.fonts.serif,
  },
  lessonCompleteScore: {
    fontSize: 18,
    fontWeight: theme.weights.bold,
    color: theme.colors.brandDark,
    textAlign: "center",
  },
  lessonCompleteMeterTrack: {
    height: 10,
    width: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  lessonCompleteMeterFill: {
    height: "100%",
    backgroundColor: theme.colors.aura,
    borderRadius: 999,
  },
  lessonCompleteStatsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  lessonCompleteStat: {
    flex: 1,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 2,
  },
  lessonCompleteStatIcon: {
    fontSize: 22,
  },
  lessonCompleteStatValue: {
    fontSize: 18,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
  },
  lessonCompleteStatLabel: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: theme.weights.bold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  lessonCompleteHint: {
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  placementResultHero: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    alignItems: "center",
    ...theme.shadows.lift,
  },
  placementResultEmoji: {
    fontSize: 64,
  },
  placementResultTitle: {
    fontSize: 26,
    fontWeight: theme.weights.display,
    color: theme.colors.ink,
    textAlign: "center",
    fontFamily: theme.fonts.serif,
  },
  placementResultScore: {
    fontSize: 16,
    color: theme.colors.brandDark,
    fontWeight: theme.weights.bold,
  },
  placementResultMeterTrack: {
    height: 12,
    width: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  placementResultMeterFill: {
    height: "100%",
    backgroundColor: theme.colors.aura,
    borderRadius: 999,
  },
  placementResultAccuracy: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: theme.weights.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  placementResultUnitBlock: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: 16,
    gap: 4,
    width: "100%",
  },
  placementResultUnitValue: {
    fontSize: 24,
    fontWeight: theme.weights.display,
    color: theme.colors.brandDark,
  },
  placementResultCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.inkSoft,
    marginTop: 4,
  },
});

