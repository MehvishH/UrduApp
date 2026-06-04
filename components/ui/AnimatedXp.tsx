import { useEffect, useRef, useState } from "react";
import { Animated, Easing, TextStyle } from "react-native";

type AnimatedXpProps = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
};

export function AnimatedXp({ value, duration = 1100, prefix = "", suffix = "", style }: AnimatedXpProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    progress.setValue(0);
    setDisplayed(0);
    const listener = progress.addListener(({ value: v }) => {
      setDisplayed(Math.round(v * value));
    });
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(listener);
  }, [progress, value, duration]);

  return (
    <Animated.Text style={style}>
      {prefix}
      {displayed}
      {suffix}
    </Animated.Text>
  );
}
