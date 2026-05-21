import { ReactNode, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../../constants/theme";

type StarryBgProps = {
  children?: ReactNode;
  dense?: boolean;
  variant?: "deep" | "default";
  style?: ViewStyle;
  fill?: boolean;
};

type StarConfig = {
  key: number;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
};

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function buildStars(count: number, seed = 7): StarConfig[] {
  const rand = seeded(seed);
  return Array.from({ length: count }).map((_, index) => ({
    key: index,
    top: `${rand() * 96}%`,
    left: `${rand() * 96}%`,
    size: 1.4 + rand() * 2.6,
    duration: 1600 + Math.floor(rand() * 2200),
    delay: Math.floor(rand() * 2400),
  }));
}

function Star({ config }: { config: StarConfig }) {
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: config.duration,
          delay: config.delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0,
          duration: config.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle, config.duration, config.delay]);

  const opacity = twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const scale = twinkle.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          top: config.top as unknown as number,
          left: config.left as unknown as number,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export function StarryBg({ children, dense = false, variant = "default", style, fill = true }: StarryBgProps) {
  const stars = useMemo(() => buildStars(dense ? 60 : 30, dense ? 13 : 7), [dense]);
  const colors = variant === "deep" ? theme.gradients.heroDeep : theme.gradients.hero;

  return (
    <View style={[fill ? styles.wrap : undefined, style]}>
      <LinearGradient
        colors={colors}
        locations={[0, 0.5, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stars.map((config) => (
          <Star key={config.key} config={config} />
        ))}
      </View>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.glowSecondary} pointerEvents="none" />
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
  star: {
    position: "absolute",
    backgroundColor: theme.colors.starSoft,
  },
  glow: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(253, 224, 71, 0.12)",
  },
  glowSecondary: {
    position: "absolute",
    bottom: -180,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
});
