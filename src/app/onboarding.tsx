import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Icon, type IconName } from '../components/ui';
import { tapFeedback } from '../core/haptics';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

const STEPS = [
  {
    icon: 'shake' as IconName,
    title: 'Despierta de verdad',
    body: 'En lugar de silenciar la alarma a ciegas, agita el teléfono hasta completar el reto. Tu cuerpo se despierta antes que tu móvil.',
  },
  {
    icon: 'alarm' as IconName,
    title: 'Alarmas a tu medida',
    body: 'Elige días, etiqueta, sonido, vibración y cuántas agitaciones necesitas. Cada alarma se programa localmente y se sincroniza en tu cuenta.',
  },
  {
    icon: 'bell' as IconName,
    title: 'Tus recordatorios',
    body: 'Entregas, citas, facturas o tomar agua. Con categorías, anticipación, repetición semanal y un historial de lo que ya hiciste.',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.userName === 'Tú' ? '' : settings.userName);
  const scrollRef = useRef<ScrollView>(null);

  const isLast = step === STEPS.length;

  const next = () => {
    tapFeedback();
    if (!isLast) {
      setStep((current) => current + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    update({ userName: name.trim() || 'Tú', onboarded: true });
    router.replace('/auth' as any);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.accent}33`, colors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Icon name="shake" size={30} color={colors.accentOn} strokeWidth={2} />
          </View>
          <Text style={[typography.display, styles.brandName, { color: colors.text }]}>SmartAlarm</Text>
        </View>

        {STEPS.slice(0, 1).map((item) => (
          <StepCard key={item.title} item={item} />
        ))}

        {step === 1 ? <StepCard item={STEPS[1]} /> : null}
        {step === 2 ? <StepCard item={STEPS[2]} /> : null}

        {isLast ? (
          <Card style={styles.nameCard}>
            <Text style={[typography.heading, { color: colors.text }]}>¿Cómo te llamamos?</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Solo se usa para darte la bienvenida en la pantalla de inicio.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textFaint}
              maxLength={24}
              style={[
                styles.input,
                typography.body,
                { color: colors.text, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
              ]}
            />
            <Text style={[typography.micro, { color: colors.textFaint }]}>
              Tus preferencias, alarmas y suscripciones se sincronizan con tu cuenta.
            </Text>
          </Card>
        ) : null}

        <View style={styles.dots}>
          {STEPS.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => {
                tapFeedback();
                setStep(index);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Ir al paso ${index + 1}`}
            >
              <View style={[styles.dot, index === step && { width: 26, backgroundColor: colors.accent }]} />
            </Pressable>
          ))}
        </View>

        <Button label={isLast ? 'Empezar' : 'Siguiente'} size="lg" fullWidth onPress={next} />
        <Pressable
          onPress={() => {
            update({ userName: name.trim() || 'Tú', onboarded: true });
            router.replace('/auth' as any);
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.skip}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>Saltar</Text>
        </Pressable>

        <View style={styles.chipRow}>
          <Chip label="Gratis" size="sm" tone="success" />
          <Chip label="Sincronizado" size="sm" />
          <Chip label="Premium opcional" size="sm" tone="warning" />
        </View>
      </ScrollView>
    </View>
  );
}

function StepCard({ item }: { item: { icon: IconName; title: string; body: string } }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.stepCard} raised>
      <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={item.icon} size={26} color={colors.accent} />
      </View>
      <Text style={[typography.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>{item.body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    letterSpacing: -0.8,
  },
  stepCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  stepIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  nameCard: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#98A4B5',
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});