import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";
import { selectionHaptic } from "../utils/haptics";

type ChoiceButtonProps = {
  label: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function ChoiceButton({ label, detail, onPress, disabled = false }: ChoiceButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    selectionHaptic();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled}
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled ? styles.buttonPressed : undefined,
          disabled ? styles.buttonDisabled : undefined,
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 18,
    ...theme.shadows.soft,
  },
  buttonPressed: {
    backgroundColor: theme.colors.brandSoft,
    borderColor: theme.colors.brandTint,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    gap: 6,
    minWidth: 0,
  },
  label: {
    color: theme.colors.ink,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: theme.weights.semibold,
    fontFamily: theme.fonts.urdu,
    textAlign: "right",
    writingDirection: "rtl",
    flexShrink: 1,
  },
  detail: {
    color: theme.colors.brandDark,
    fontSize: 15,
    fontWeight: theme.weights.semibold,
    flexShrink: 1,
  },
});
