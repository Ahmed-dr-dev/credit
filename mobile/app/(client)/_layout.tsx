import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View> 
  );
}

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Accueil" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="demande"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Demande" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📁" label="Documents" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rendez-vous"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="RDV" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    height: 72,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: "center",
    gap: 2,
    paddingTop: 4,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },
  labelActive: {
    color: "#1d4ed8",
  },
});
