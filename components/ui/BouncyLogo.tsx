import { useEffect, useRef } from "react";
import { Animated, Easing, ImageSourcePropType, StyleSheet, View, ViewStyle } from "react-native";

type BouncyLogoProps = {
  source: ImageSourcePropType;
  size?: number;
  delay?: number;
  style?: ViewStyle;
};

export function BouncyLogo({ source, size = 180, delay = 120, style }: BouncyLogoProps) {
  const translateY = useRef(new Animated.Value(90)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
        tension: 70,
        delay,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 80,
        delay,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay,
      }),
      Animated.sequence([
        Animated.delay(delay + 200),
        Animated.timing(glow, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entrance.start(() => {
      // After the pop, drift gently side to side so the cat feels alive.
      Animated.loop(
        Animated.sequence([
          Animated.timing(sway, {
            toValue: 1,
            duration: 1700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sway, {
            toValue: -1,
            duration: 1700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sway, {
            toValue: 0,
            duration: 1700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    return () => {
      sway.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
      opacity.stopAnimation();
      glow.stopAnimation();
    };
  }, [translateY, scale, opacity, sway, glow, delay]);

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-4deg", "4deg"],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.05],
  });

  return (
    <View style={[styles.wrap, { width: size * 1.4, height: size * 1.4 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.Image
        source={source}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size * 0.22,
            opacity,
            transform: [
              { translateY },
              { scale },
              { rotate },
            ],
          },
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(253, 224, 71, 0.35)",
  },
  image: {
    shadowColor: "#022c22",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
  },
});
