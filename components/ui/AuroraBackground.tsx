import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../../constants/theme";

type AuroraVariant = "default" | "hero" | "soft" | "dark";

type AuroraBackgroundProps = {
  children: ReactNode;
  variant?: AuroraVariant;
  style?: ViewStyle;
};

const VARIANT_COLORS: Record<AuroraVariant, readonly [string, string, string]> = {
  default: theme.gradients.background,
  hero: ["#f7fbf7", "#dff0e6", "#c8e2d5"] as const,
  soft: ["#ffffff", "#f0f9f3", "#e1f1e8"] as const,
  dark: theme.gradients.hero,
};

const VARIANT_LOCATIONS: Record<AuroraVariant, readonly [number, number, number]> = {
  default: [0, 0.55, 1],
  hero: [0, 0.55, 1],
  soft: [0, 0.55, 1],
  dark: [0, 0.5, 1],
};

const VARIANT_DIRECTION: Record<AuroraVariant, { start: { x: number; y: number }; end: { x: number; y: number } }> = {
  default: { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } },
  hero: { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } },
  soft: { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } },
  dark: { start: { x: 0.05, y: 0 }, end: { x: 0.95, y: 1 } },
};

export function AuroraBackground({ children, variant = "default", style }: AuroraBackgroundProps) {
  const colors = VARIANT_COLORS[variant];
  const locations = VARIANT_LOCATIONS[variant];
  const direction = VARIANT_DIRECTION[variant];
  const isDark = variant === "dark";

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={colors}
        locations={locations}
        start={direction.start}
        end={direction.end}
        style={StyleSheet.absoluteFill}
      />
      <View style={isDark ? styles.glowDark : styles.glow} pointerEvents="none" />
      {isDark ? <View style={styles.glowDarkSecondary} pointerEvents="none" /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  glowDark: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(253, 224, 71, 0.12)",
  },
  glowDarkSecondary: {
    position: "absolute",
    bottom: -180,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
});
