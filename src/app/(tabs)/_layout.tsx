import { Tabs } from 'expo-router';

import { TabBar } from '../../components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="alarms" options={{ title: 'Alarmas' }} />
      <Tabs.Screen name="reminders" options={{ title: 'Recordatorios' }} />
      <Tabs.Screen name="premium" options={{ title: 'Premium' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
