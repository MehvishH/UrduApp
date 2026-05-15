import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../../constants/theme";

type AuroraBackgroundProps = {
  children: ReactNode;
  variant?: "default" | "hero" | "soft";
  style?: ViewStyle;
};

const VARIANT_COLORS: Record<NonNullable<AuroraBackgroundProps["variant"]>, readonly [string, string, string]> = {
  default: theme.gradients.background,
  hero: ["#f7fbf7", "#dff0e6", "#c8e2d5"] as const,
  soft: ["#ffffff", "#f0f9f3", "#e1f1e8"] as const,
};

export function AuroraBackground({ children, variant = "default", style }: AuroraBackgroundProps) {
  const colors = VARIANT_COLORS[variant];
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={colors}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} pointerEvents="none" />
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
    backgroundColor: "rgba(143, 209, 111, 0.18)",
  },
});
