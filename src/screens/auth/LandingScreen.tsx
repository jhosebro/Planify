import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BrandLogo } from '@/components/BrandLogo';
import { AppIcon, type IconName } from '@/components/AppIcon';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { neuShadow } from '@/lib/neumorphic';
import type { AuthStackParamList } from '@/navigation/types';

/** URL de la ficha en Google Play. Mientras sea null se muestra "Próximamente". */
export const PLAY_STORE_URL: string | null = null;

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'wallet', title: 'Todas tus cuentas', text: 'Efectivo, bancos y billeteras digitales con su saldo siempre al día.' },
  { icon: 'arrow-left-right', title: 'Movimientos en segundos', text: 'Registra ingresos, gastos y transferencias por categoría.' },
  { icon: 'chart-pie', title: 'Presupuestos mensuales', text: 'Pon límites por categoría y mira cuánto te queda antes de gastarlo.' },
  { icon: 'credit-card', title: 'Deudas y tarjetas', text: 'Cuotas, compras con tarjeta y préstamos: lo que debes y lo que te deben.' },
  { icon: 'target', title: 'Metas de ahorro', text: 'Define objetivos y sigue tu progreso hasta cumplirlos.' },
  { icon: 'list-checks', title: 'Seguimiento', text: 'Listas para controlar compras, pedidos y pendientes del hogar.' },
];

const STEPS = [
  { title: 'Crea tu cuenta', text: 'Gratis, con tu correo o con Google.' },
  { title: 'Agrega tus cuentas', text: 'Registra tus saldos iniciales y tus deudas.' },
  { title: 'Toma el control', text: 'Anota tus movimientos y mira a dónde va tu dinero.' },
];

export function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const { width } = useResponsiveLayout();
  const isWide = width >= 960;
  const featureColumns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;

  const card = { backgroundColor: colors.surface, ...neuShadow(scheme, 'flat') };

  const PrimaryCta = ({ label }: { label: string }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('Register')}
      style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.btnText, { color: colors.textInverse }]}>{label}</Text>
      <AppIcon name="arrow-right" size={18} color={colors.textInverse} />
    </Pressable>
  );

  const PlayBadge = () =>
    PLAY_STORE_URL ? (
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(PLAY_STORE_URL)}
        style={[styles.badge, { borderColor: colors.textPrimary }]}
      >
        <AppIcon name="play" size={16} color={colors.textPrimary} />
        <Text style={[styles.badgeText, { color: colors.textPrimary }]}>Descargar en Google Play</Text>
      </Pressable>
    ) : (
      <View style={[styles.badge, { borderColor: colors.border }]}>
        <AppIcon name="smartphone" size={16} color={colors.textSecondary} />
        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Próximamente en Google Play</Text>
      </View>
    );

  return (
    <ScrollView style={{ backgroundColor: colors.backgroundPrimary }} contentContainerStyle={styles.scroll}>
      <View style={[styles.container, { paddingHorizontal: width < 768 ? 20 : 32 }]}>
        {/* Barra superior */}
        <View style={styles.nav}>
          <View style={styles.brand}>
            <BrandLogo size={34} />
            <Text style={[styles.brandText, { color: colors.textPrimary }]}>Planify</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')} style={styles.navLink}>
            <Text style={[styles.navLinkText, { color: colors.primary }]}>Iniciar sesión</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={[styles.heroCopy, isWide && { flex: 1 }]}>
            <View style={[styles.pill, { backgroundColor: colors.primary + '1F' }]}>
              <AppIcon name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary }]}>Gratis · Web y Android</Text>
            </View>
            <Text style={[styles.h1, { color: colors.textPrimary }, width < 768 && styles.h1Small]}>
              Tus finanzas personales, por fin claras.
            </Text>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              Planify reúne tus cuentas, gastos, presupuestos, deudas y metas en un solo lugar, para que sepas
              exactamente cuánto tienes y a dónde va tu dinero.
            </Text>
            <View style={styles.ctaRow}>
              <PrimaryCta label="Empezar gratis" />
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('Login')}
                style={[styles.btn, styles.btnGhost, { borderColor: colors.border }]}
              >
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Ya tengo cuenta</Text>
              </Pressable>
            </View>
            <PlayBadge />
          </View>

          {isWide && (
            <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.phone, card]}>
                <View style={[styles.mockBalance, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.mockLabel, { color: colors.textInverse }]}>Saldo total</Text>
                  <Text style={[styles.mockAmount, { color: colors.textInverse }]}>$4.250.000</Text>
                </View>
                {[
                  { icon: 'shopping-cart' as IconName, name: 'Mercado', amount: '-$182.400', color: colors.redExpenses },
                  { icon: 'banknote' as IconName, name: 'Salario', amount: '+$3.500.000', color: colors.greenEarns },
                  { icon: 'credit-card' as IconName, name: 'Tarjeta · cuota 3/12', amount: '-$95.000', color: colors.redExpenses },
                ].map((row) => (
                  <View key={row.name} style={[styles.mockRow, { borderBottomColor: colors.border }]}>
                    <AppIcon name={row.icon} size={18} color={colors.textSecondary} />
                    <Text style={[styles.mockRowName, { color: colors.textPrimary }]}>{row.name}</Text>
                    <Text style={[styles.mockRowAmount, { color: row.color }]}>{row.amount}</Text>
                  </View>
                ))}
                <Text style={[styles.mockLabel, { color: colors.textSecondary, marginTop: 16 }]}>Meta: viaje</Text>
                <View style={[styles.mockTrack, { backgroundColor: colors.surfacePressed }]}>
                  <View style={[styles.mockFill, { backgroundColor: colors.greenEarns }]} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Funciones */}
        <Text style={[styles.h2, { color: colors.textPrimary }]}>Todo lo que necesitas para organizar tu dinero</Text>
        <View style={styles.grid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={{ width: `${100 / featureColumns}%`, padding: 10 }}>
              <View style={[styles.featureCard, card]}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '1F' }]}>
                  <AppIcon name={f.icon} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.h3, { color: colors.textPrimary }]}>{f.title}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Cómo funciona */}
        <Text style={[styles.h2, { color: colors.textPrimary }]}>Empieza en tres pasos</Text>
        <View style={[styles.steps, width >= 768 && { flexDirection: 'row' }]}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.step, width >= 768 && { flex: 1 }]}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumText, { color: colors.textInverse }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.h3, { color: colors.textPrimary }]}>{s.title}</Text>
              <Text style={[styles.body, styles.stepText, { color: colors.textSecondary }]}>{s.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA final */}
        <View style={[styles.finalCta, { backgroundColor: colors.primary }]}>
          <Text style={[styles.h2, styles.finalTitle, { color: colors.textInverse }]}>
            Empieza hoy a tomar mejores decisiones con tu dinero
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.textInverse, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.btnText, { color: colors.primary }]}>Crear mi cuenta gratis</Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>© {new Date().getFullYear()} Planify</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  navLink: { paddingVertical: 8, paddingHorizontal: 12 },
  navLinkText: { fontSize: 15, fontWeight: '700' },
  hero: { paddingTop: 40, paddingBottom: 72, gap: 48 },
  heroWide: { flexDirection: 'row', alignItems: 'center', paddingTop: 72, paddingBottom: 96 },
  heroCopy: { gap: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '700' },
  h1: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5 },
  h1Small: { fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  lead: { fontSize: 18, lineHeight: 28, maxWidth: 560 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, paddingHorizontal: 26, borderRadius: 14 },
  btnGhost: { borderWidth: 1.5 },
  btnText: { fontSize: 16, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  heroArt: { flex: 1, alignItems: 'center' },
  phone: { width: 340, borderRadius: 28, padding: 20 },
  mockBalance: { borderRadius: 18, padding: 20, marginBottom: 12 },
  mockLabel: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  mockAmount: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  mockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  mockRowName: { flex: 1, fontSize: 14, fontWeight: '600' },
  mockRowAmount: { fontSize: 14, fontWeight: '700' },
  mockTrack: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  mockFill: { width: '64%', height: '100%', borderRadius: 4 },
  h2: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', marginBottom: 28 },
  h3: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10, marginBottom: 80 },
  featureCard: { borderRadius: 20, padding: 24, height: '100%' },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  steps: { gap: 24, marginBottom: 80 },
  step: { alignItems: 'center', paddingHorizontal: 12 },
  stepText: { textAlign: 'center' },
  stepNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stepNumText: { fontSize: 17, fontWeight: '800' },
  finalCta: { borderRadius: 28, paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  finalTitle: { maxWidth: 640 },
  footer: { textAlign: 'center', fontSize: 13, paddingVertical: 32 },
});
