import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import { useRouter } from '../hooks/useRouter';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Icon, SegmentedControl } from '../components/ui';
import { auth, db } from '../core/firebase';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

const SECURE_EMAIL_KEY = 'smartalarm_biometric_email';
const SECURE_PASS_KEY = 'smartalarm_biometric_password';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const isLogin = mode === 'login';

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync(SECURE_EMAIL_KEY);
      setBiometricAvailable(hasHardware && isEnrolled && !!savedEmail);
    })();
  }, []);

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresa con tu huella o Face ID',
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (!result.success) return;

    const savedEmail = await SecureStore.getItemAsync(SECURE_EMAIL_KEY);
    const savedPassword = await SecureStore.getItemAsync(SECURE_PASS_KEY);

    if (!savedEmail || !savedPassword) {
      Alert.alert('Sin credenciales', 'Inicia sesión manualmente primero para activar la biometría.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      setLoading(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error de Autenticación', error.message);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Por favor ingresa correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        await SecureStore.setItemAsync(SECURE_EMAIL_KEY, email);
        await SecureStore.setItemAsync(SECURE_PASS_KEY, password);
      } else {
        // Registrar Nuevo Usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Crear documento inicial del usuario en Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          isPremium: false,
          createdAt: new Date().toISOString(),
        });
      }

      setLoading(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error de Autenticación', error.message);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.accent}33`, colors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Icon name="shake" size={30} color={colors.accentOn} strokeWidth={2} />
            </View>
            <Text style={[typography.display, styles.brandName, { color: colors.text }]}>SmartAlarm</Text>
            <Text style={[typography.body, styles.tagline, { color: colors.textMuted }]}>
              Despierta de verdad: agita el teléfono hasta completar el reto.
            </Text>
          </View>

          <Card style={styles.card} raised>
            <SegmentedControl<Mode>
              segments={[
                { id: 'login', label: 'Iniciar sesión' },
                { id: 'register', label: 'Crear cuenta' },
              ]}
              value={mode}
              onChange={setMode}
            />

            <View style={styles.fields}>
              <Field
                icon="mail"
                label="Correo electrónico"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <Field
                icon="lock"
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={isLogin ? 'password' : 'newPassword'}
                returnKeyType="go"
                onSubmitEditing={() => void handleAuth()}
                editable={!loading}
              />
            </View>

            <Button
              label={isLogin ? 'Entrar' : 'Registrarse'}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleAuth}
            />

            {isLogin && biometricAvailable && (
              <TouchableOpacity
                style={[styles.biometricBtn, { borderColor: colors.border }]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Icon name="fingerprint" size={20} color={colors.accent} />
                <Text style={[typography.body, { color: colors.accent }]}>Entrar con biometría</Text>
              </TouchableOpacity>
            )}

            <Text style={[typography.micro, styles.hint, { color: colors.textFaint }]}>
              {isLogin
                ? 'Entra con el correo con el que creaste tu cuenta.'
                : 'Tu alarma, tus recordatorios y tu suscripción se sincronizan con esta cuenta.'}
            </Text>
          </Card>

          <Text style={[typography.caption, styles.switchLabel, { color: colors.textMuted }]}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </Text>
          <Button
            label={isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            variant="outline"
            fullWidth
            disabled={loading}
            onPress={() => setMode(isLogin ? 'register' : 'login')}
          />

          <View style={styles.chipRow}>
            <Chip label="Sincronizado" size="sm" icon={<Icon name="refresh" size={12} color={colors.textMuted} />} />
            <Chip label={settings.premium ? 'Premium activo' : 'Premium opcional'} size="sm" tone="warning" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* --------------------------------- Field --------------------------------- */

type FieldProps = React.ComponentProps<typeof TextInput> & {
  icon: 'mail' | 'lock';
  label: string;
};

function Field({ icon, label, style, ...rest }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[typography.micro, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
        ]}
      >
        <Icon name={icon} size={17} color={colors.textFaint} />
        <TextInput
          {...rest}
          placeholderTextColor={colors.textFaint}
          style={[typography.body, styles.input, { color: colors.text }, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
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
  tagline: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  fields: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
  },
  hint: {
    textAlign: 'center',
  },
  switchLabel: {
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});