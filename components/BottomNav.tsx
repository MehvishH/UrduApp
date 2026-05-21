import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

import { theme } from "../constants/theme";
import { selectionHaptic } from "../utils/haptics";

export type BottomTab = "learn" | "league" | "friends" | "profile";

type BottomNavProps = {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
};

type TabItem = {
  id: BottomTab;
  label: string;
  icon: (active: boolean) => ReactElement;
};

const ICON_SIZE = 22;

function iconStroke(active: boolean) {
  return active ? theme.colors.bgEmerald : theme.colors.inkOnDarkSoft;
}

const HomeIcon = (active: boolean) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

const TrophyIcon = (active: boolean) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <Path d="M4 22h16" />
    <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Svg>
);

const UsersIcon = (active: boolean) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx={9} cy={7} r={4} />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

const SettingsIcon = (active: boolean) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx={12} cy={12} r={3} />
  </Svg>
);

const TABS: TabItem[] = [
  { id: "learn", label: "Learn", icon: HomeIcon },
  { id: "league", label: "League", icon: TrophyIcon },
  { id: "friends", label: "Friends", icon: UsersIcon },
  { id: "profile", label: "Profile", icon: SettingsIcon },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                if (isActive) return;
                selectionHaptic();
                onChange(tab.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                isActive ? styles.tabActive : undefined,
                pressed && !isActive ? styles.tabPressed : undefined,
              ]}
            >
              <View style={styles.iconWrap}>{tab.icon(isActive)}</View>
              <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: theme.colors.bgEmerald,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.radius.md,
    alignItems: "center",
    gap: 4,
  },
  tabActive: {
    backgroundColor: theme.colors.aura,
  },
  tabPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  iconWrap: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: theme.weights.bold,
    color: theme.colors.inkOnDarkSoft,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: theme.colors.bgEmerald,
  },
});
