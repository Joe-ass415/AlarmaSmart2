import { useStripe } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../components/screen-header';
import { Button, Card, Icon, type IconName } from '../../components/ui';
import { SOUNDS, freeSoundCount, isSoundLocked } from '../../core/sounds';
import { useSettings } from '../../state/SettingsContext';
import { tabBarStore } from '../../state/useTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius, spacing, typography } from '../../theme/tokens';

// Reemplaza esta URL con tu dirección de ngrok o tu servidor backend en Node.js
const SERVER_URL = 'https://bodacious-doorstep-womankind.ngrok-free.dev';

const FREE_FEATURES: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'alarm', title: 'Alarmas con reto de agitación', detail: 'Ilimitadas, con días de repetición' },
  { icon: 'repeat', title: 'Repetición semanal', detail: 'Selecciona los días que necesites' },
  { icon: 'bell', title: 'Recordatorios y notificaciones', detail: 'Con anticipación y categorías' },
  { icon: 'sun', title: 'Tema claro y oscuro', detail: 'Se adapta al sistema o elige tú' },
];

const PREMIUM_FEATURES: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'sparkles', title: 'Biblioteca ampliada de sonidos', detail: `${SOUNDS.length - freeSoundCount()} sonidos exclusivos, con vista previa` },
  { icon: 'star', title: 'Perfiles de alarma', detail: 'Despertar suave, intenso, modo estudio' },
  { icon: 'calendar', title: 'Integración con el calendario', detail: 'Asocia alarmas y avisos a tus eventos' },
  { icon: 'activity', title: 'Estadísticas de uso', detail: 'Rachas, tiempo de respuesta y gráficos' },
  { icon: 'moon', title: 'Temas visuales extra', detail: 'Paletas y modo oscuro refinado' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, trialDaysLeft, setPremium } = useSettings();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null);

  const previewSounds = SOUNDS.filter((sound) => isSoundLocked(sound, settings.premium)).slice(0, 4);

  const handlePayWithStripe = async (amountInCents: number, planType: 'monthly' | 'annual') => {
    setLoadingPlan(planType);
    try {
      // 1. Solicitar el paymentIntent al servidor Node.js
      const response = await fetch(`${SERVER_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInCents }),
      });

      const data = await response.json();

      if (!data.paymentIntent) {
        throw new Error('No se recibió la respuesta de Stripe del servidor.');
      }

      // 2. Inicializar la hoja de pago (Payment Sheet) de Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'SmartAlarm Premium',
        paymentIntentClientSecret: data.paymentIntent,
        defaultBillingDetails: { name: 'Usuario SmartAlarm' },
      });

      if (initError) {
        Alert.alert('Error de Stripe', initError.message);
        setLoadingPlan(null);
        return;
      }

      // 3. Desplegar la pasarela nativa de Stripe
      const { error: presentError } = await presentPaymentSheet();
      setLoadingPlan(null);

      if (presentError) {
        Alert.alert('Pago cancelado', presentError.message);
      } else {
        Alert.alert('¡Pago Exitoso! ', 'Tu suscripción Premium ha sido activada.');
        await setPremium(true);
      }
    } catch (error) {
      setLoadingPlan(null);
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con el servidor de pagos. Verifica que el servidor Node.js y ngrok estén corriendo.'
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Premium" subtitle="Despierta mejor, no más difícil" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        onScroll={(event) => tabBarStore.setVisible(event.nativeEvent.contentOffset.y < 120)}
        scrollEventThrottle={16}
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.secondary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.crownBubble, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Icon name="crown" size={30} color="#FFFFFF" strokeWidth={1.8} />
          </View>

          <Text style={[typography.display, styles.heroTitle, { color: '#FFFFFF' }]}>Shake Premium</Text>
          <Text style={[typography.body, styles.heroBody, { color: 'rgba(255,255,255,0.9)' }]}>
            Todo lo gratis, más sonidos exclusivos, perfiles de alarma y estadísticas para que veas tu progreso real.
          </Text>

          {settings.premium ? (
            <View style={[styles.trialPill, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Icon name="check-circle" size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={[typography.micro, { color: '#FFFFFF' }]}>
                {trialDaysLeft !== null ? `Prueba activa · ${trialDaysLeft} días restantes` : 'Suscripción activa'}
              </Text>
            </View>
          ) : null}
        </View>

        <FeatureList title="Gratis, siempre" icon="check-circle" tone={colors.textMuted} features={FREE_FEATURES} />

        <FeatureList title="Con Premium" icon="sparkles" tone={colors.accent} features={PREMIUM_FEATURES} />

        {previewSounds.length > 0 ? (
          <Card style={styles.soundsCard}>
            <Text style={[typography.heading, { color: colors.text }]}>Escucha la diferencia</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Sonidos bloqueados en tu plan actual. Con Premium puedes previsualizarlos y usarlos en cualquier alarma.
            </Text>

            <View style={styles.soundList}>
              {previewSounds.map((sound) => (
                <View key={sound.id} style={[styles.soundRow, { backgroundColor: colors.surfaceSunken }]}>
                  <Icon name="volume" size={16} color={colors.accent} />
                  <View style={styles.soundText}>
                    <Text style={[typography.caption, { color: colors.text }]}>{sound.name}</Text>
                    <Text numberOfLines={1} style={[typography.micro, { color: colors.textFaint }]}>
                      {sound.description}
                    </Text>
                  </View>
                  <Icon name="lock" size={15} color={colors.warning} />
                </View>
              ))}
            </View>

            <Button
              label="Ver biblioteca completa"
              variant="ghost"
              fullWidth
              onPress={() => router.push('/sounds')}
            />
          </Card>
        ) : null}

        <Card style={styles.plansCard}>
          <Text style={[typography.heading, { color: colors.text }]}>Planes</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Selecciona un plan para realizar el proceso de pago seguro a través de Stripe.
          </Text>

          <View style={styles.planRow}>
            <PlanTile
              title="Mensual"
              price="2,99 €"
              detail="al mes"
              featured={false}
              loading={loadingPlan === 'monthly'}
              disabled={loadingPlan !== null || settings.premium}
              onPress={() => handlePayWithStripe(299, 'monthly')}
            />
            <PlanTile
              title="Anual"
              price="19,99 €"
              detail="2,17 €/mes · 44 % dto."
              featured
              loading={loadingPlan === 'annual'}
              disabled={loadingPlan !== null || settings.premium}
              onPress={() => handlePayWithStripe(1999, 'annual')}
            />
          </View>

          {settings.premium ? (
            <Button
              label="Restablecer a plan gratuito"
              variant="ghost"
              fullWidth
              onPress={() => setPremium(false)}
            />
          ) : null}
        </Card>

        <Text style={[typography.micro, styles.footnote, { color: colors.textFaint }]}>
          Los pagos son procesados de forma segura mediante el sistema oficial de Stripe en modo de prueba.
        </Text>
      </ScrollView>
    </View>
  );
}

type FeatureListProps = {
  title: string;
  icon: IconName;
  tone: string;
  features: { icon: IconName; title: string; detail: string }[];
};

function FeatureList({ title, icon, tone, features }: FeatureListProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <Icon name={icon} size={17} color={tone} strokeWidth={2.2} />
        <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.featureRows}>
        {features.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name={feature.icon} size={16} color={colors.textMuted} />
            </View>
            <View style={styles.featureText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{feature.title}</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>{feature.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

type PlanTileProps = {
  title: string;
  price: string;
  detail: string;
  featured: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function PlanTile({ title, price, detail, featured, loading, disabled, onPress }: PlanTileProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.planTile,
        {
          backgroundColor: featured ? colors.accentSoft : colors.surfaceAlt,
          borderColor: featured ? colors.accent : colors.border,
          opacity: disabled && !loading ? 0.6 : 1,
        },
      ]}
    >
      {featured ? (
        <View style={[styles.planBadge, { backgroundColor: colors.accent }]}>
          <Text style={[typography.micro, { color: colors.accentOn, fontSize: 9 }]}>AHORRA 44 %</Text>
        </View>
      ) : null}
      <Text style={[typography.caption, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[typography.title, { color: colors.text, fontFamily: fonts.display }]}>{price}</Text>
      <Text style={[typography.micro, { color: colors.textFaint }]}>{detail}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
      ) : (
        <Button
          label="Elegir"
          size="sm"
          variant={featured ? 'primary' : 'ghost'}
          fullWidth
          disabled={disabled}
          onPress={onPress}
        />
      )}
    </View>
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
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  crownBubble: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroBody: {
    textAlign: 'center',
    maxWidth: 300,
  },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginTop: spacing.xxs,
  },
  featureCard: {
    gap: spacing.md,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureRows: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 1,
  },
  soundsCard: {
    gap: spacing.sm,
  },
  soundList: {
    gap: spacing.xs,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  soundText: {
    flex: 1,
    gap: 1,
  },
  plansCard: {
    gap: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  planTile: {
    flex: 1,
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'flex-start',
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  footnote: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});