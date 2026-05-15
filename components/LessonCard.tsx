import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";
import { Lesson } from "../types/quiz";

type LessonCardProps = {
  lesson: Lesson;
  completed: boolean;
  locked?: boolean;
  onPress: () => void;
};

export function LessonCard({ lesson, completed, locked = false, onPress }: LessonCardProps) {
  return (
    <Pressable disabled={locked} onPress={onPress} style={[styles.card, locked ? styles.cardLocked : undefined]}>
      <View style={[styles.badge, { backgroundColor: lesson.accent }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{lesson.title}</Text>
          <View style={[styles.statusBadge, locked ? styles.statusBadgeLocked : completed ? styles.statusBadgeDone : styles.statusBadgeQuiz]}>
            <Text style={[styles.status, locked ? styles.statusLocked : completed ? styles.statusDone : styles.statusQuiz]}>
              {locked ? "Locked" : completed ? "Done" : `${lesson.questions.length} Qs`}
            </Text>
          </View>
        </View>
        <Text style={styles.description}>{lesson.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  cardLocked: {
    opacity: 0.55,
  },
  badge: {
    width: 14,
    borderRadius: 99,
  },
  content: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.ink,
    flex: 1,
    flexShrink: 1,
  },
  statusBadge: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusBadgeLocked: {
    backgroundColor: "#edf2ef",
  },
  statusBadgeDone: {
    backgroundColor: "#e6f6ed",
  },
  statusBadgeQuiz: {
    backgroundColor: "#edf8f1",
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  statusLocked: {
    color: theme.colors.muted,
  },
  statusDone: {
    color: theme.colors.success,
  },
  statusQuiz: {
    color: theme.colors.brandDark,
  },
  description: {
    color: theme.colors.muted,
    lineHeight: 20,
    flexShrink: 1,
  },
});
