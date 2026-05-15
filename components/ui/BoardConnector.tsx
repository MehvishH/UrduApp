import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { theme } from "../../constants/theme";

type Direction = "leftToRight" | "rightToLeft" | "straight";

type BoardConnectorProps = {
  direction: Direction;
  color?: string;
  unlocked?: boolean;
  height?: number;
};

export function BoardConnector({
  direction,
  color = theme.colors.brand,
  unlocked = true,
  height = 56,
}: BoardConnectorProps) {
  const stroke = unlocked ? color : theme.colors.border;
  const width = 220;
  const padding = 18;
  const top = padding;
  const bottom = height - padding;

  const path = (() => {
    if (direction === "straight") {
      return `M ${width / 2} ${top} L ${width / 2} ${bottom}`;
    }
    if (direction === "leftToRight") {
      const sx = width * 0.18;
      const ex = width * 0.82;
      const cy = (top + bottom) / 2;
      return `M ${sx} ${top} C ${sx} ${cy}, ${ex} ${cy}, ${ex} ${bottom}`;
    }
    const sx = width * 0.82;
    const ex = width * 0.18;
    const cy = (top + bottom) / 2;
    return `M ${sx} ${top} C ${sx} ${cy}, ${ex} ${cy}, ${ex} ${bottom}`;
  })();

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Path
          d={path}
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={unlocked ? undefined : "4 8"}
          fill="none"
          opacity={unlocked ? 0.55 : 0.45}
        />
        <Path
          d={path}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={unlocked ? 0.9 : 0.7}
        />
        {unlocked ? (
          <>
            <Circle cx={width * 0.5} cy={(top + bottom) / 2 - 6} r="2" fill={stroke} opacity={0.45} />
            <Circle cx={width * 0.5} cy={(top + bottom) / 2 + 6} r="2" fill={stroke} opacity={0.25} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
});
