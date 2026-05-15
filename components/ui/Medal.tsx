import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { theme } from "../../constants/theme";

export type MedalRank = "gold" | "silver" | "bronze" | "friend" | "you";

type MedalProps = {
  rank: MedalRank;
  size?: number;
  place?: number;
};

const PALETTES: Record<MedalRank, { fill: [string, string]; ribbon: string; rim: string; glyph: string }> = {
  gold:   { fill: ["#ffe589", "#e0a92a"], ribbon: "#c4561a", rim: "#a47800", glyph: "1" },
  silver: { fill: ["#eef2f5", "#a8b6c0"], ribbon: "#4a6478", rim: "#7a8a96", glyph: "2" },
  bronze: { fill: ["#f3c499", "#b87547"], ribbon: "#5a3a23", rim: "#8a5230", glyph: "3" },
  friend: { fill: ["#d6f0df", "#7abf9a"], ribbon: theme.colors.brandDark, rim: theme.colors.brand, glyph: "★" },
  you:    { fill: ["#fff6c8", "#f1c95e"], ribbon: theme.colors.brandDark, rim: theme.colors.brand, glyph: "♥" },
};

export function Medal({ rank, size = 44, place }: MedalProps) {
  const palette = PALETTES[rank];
  const label = place != null ? String(place) : palette.glyph;

  return (
    <View style={[styles.wrap, { width: size, height: size * 1.18 }]}>
      <Svg width={size} height={size * 1.18} viewBox="0 0 44 52">
        <Defs>
          <SvgLinearGradient id={`medal-${rank}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.fill[0]} />
            <Stop offset="1" stopColor={palette.fill[1]} />
          </SvgLinearGradient>
        </Defs>
        <Path d="M14 4 L22 22 L14 22 Z" fill={palette.ribbon} opacity={0.85} />
        <Path d="M30 4 L22 22 L30 22 Z" fill={palette.ribbon} />
        <Circle cx="22" cy="30" r="16" fill={`url(#medal-${rank})`} stroke={palette.rim} strokeWidth={1.5} />
        <Circle cx="22" cy="30" r="11" fill="none" stroke={palette.rim} strokeOpacity={0.35} strokeWidth={1} />
        <SvgText
          x="22"
          y={label.length > 1 ? "35" : "36"}
          fontSize={label === "★" || label === "♥" ? "16" : "18"}
          fontWeight="900"
          fill={palette.rim}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
