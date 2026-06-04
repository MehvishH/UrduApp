import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";

type ConfettiProps = {
  active: boolean;
  count?: number;
  duration?: number;
};

type Particle = {
  key: number;
  startX: number;
  endX: number;
  color: string;
  size: number;
  delay: number;
  rotateTo: string;
  fallDistance: number;
  shape: "square" | "circle";
};

const COLORS = [
  theme.colors.aura,
  theme.colors.auraDeep,
  theme.colors.brand,
  theme.colors.brandTint,
  theme.colors.fire,
  theme.colors.heart,
  theme.colors.bgEmeraldDeep,
];

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function buildParticles(count: number): Particle[] {
  const screen = Dimensions.get("window");
  const rand = seeded(Date.now() % 100000);
  return Array.from({ length: count }).map((_, index) => {
    const startX = rand() * screen.width;
    const drift = (rand() - 0.5) * 180;
    const size = 6 + rand() * 8;
    return {
      key: index,
      startX,
      endX: startX + drift,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      size,
      delay: Math.floor(rand() * 700),
      rotateTo: `${Math.floor((rand() - 0.5) * 720)}deg`,
      fallDistance: screen.height + 80,
      shape: rand() > 0.5 ? "square" : "circle",
    };
  });
}

function Piece({ config, duration }: { config: Particle; duration: number }) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fall.setValue(0);
    Animated.timing(fall, {
      toValue: 1,
      duration,
      delay: config.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fall, duration, config.delay]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-40, config.fallDistance] });
  const translateX = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startX, config.endX],
  });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", config.rotateTo] });
  const opacity = fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: config.size,
        height: config.size,
        borderRadius: config.shape === "circle" ? config.size / 2 : 2,
        backgroundColor: config.color,
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate },
        ],
      }}
    />
  );
}

export function Confetti({ active, count = 50, duration = 2400 }: ConfettiProps) {
  // Re-seed particles whenever active flips on so each play looks fresh.
  const particles = useMemo(() => (active ? buildParticles(count) : []), [active, count]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((config) => (
        <Piece key={config.key} config={config} duration={duration} />
      ))}
    </View>
  );
}
