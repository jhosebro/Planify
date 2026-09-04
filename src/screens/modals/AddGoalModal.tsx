import React, { useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { GoalService } from '@/services/goals';
import type { GoalPriority, GoalType, InstallmentFrequency } from '@/services/goals';
import type { MainStackParamList } from '@/navigation/types';
import { CyclicDatePicker } from '@/components/CyclicDatePicker';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatWithThousands(value: string): string {
  const clean = value.replace(/[^0-9]/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function AddGoalModal() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'AddGoal'>>();
  const goalId = route.params?.goalId;
  const isEditMode = !!goalId;

  const goalService = useMemo(() => new GoalService(), []);
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [type, setType] = useState<GoalType>('personal');
  const [frequency, setFrequency] = useState<InstallmentFrequency>('monthly');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Date
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const [year, setYear] = useState(future.getFullYear());
  const [month, setMonth] = useState(future.getMonth());
  const [day, setDay] = useState(Math.min(future.getDate(), getDaysInMonth(future.getFullYear(), future.getMonth())));
  const [showDate, setShowDate] = useState(false);
  const daysInMonth = getDaysInMonth(year, month);

  // Load existing goal for edit mode
  React.useEffect(() => {
    if (goalId) {
      goalService.getById(goalId).then((g) => {
        if (g) {
          setName(g.name);
          setDescription(g.description ?? '');
          setDisplayAmount(formatWithThousands(Math.round(g.targetAmount / 100).toString()));
          setPriority(g.priority);
          setType(g.type);
          setFrequency(g.installmentFrequency);
          // Use UTC to avoid timezone offset issues with date-only values
          setYear(g.targetDate.getUTCFullYear());
          setMonth(g.targetDate.getUTCMonth());
          setDay(g.targetDate.getUTCDate());
          setLoaded(true);
        }
      }).catch((err) => {
        console.error('Error loading goal for edit:', err);
      });
    }
  }, [goalId, goalService]);
  const formattedDate = `${day.toString().padStart(2, '0')} ${MONTHS[month]} ${year}`;

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es obligatorio.'); return; }
    const amount = parseInt(displayAmount.replace(/\./g, ''), 10);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Error', 'El costo estimado debe ser mayor a 0.'); return; }

    setSaving(true);
    try {
      const goalData = {
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: amount * 100,
        priority,
        type,
        // Create date in UTC to avoid timezone offset when converting to ISO string
        targetDate: new Date(Date.UTC(year, month, day)),
        installmentFrequency: frequency,
      };

      if (isEditMode && goalId) {
        await goalService.update(goalId, goalData);
      } else {
        await goalService.create(goalData);
      }
      navigation.goBack();
    } catch (error) {
      console.error('[AddGoalModal] submit error:', error);
      Alert.alert('Error', isEditMode ? 'No se pudo actualizar la meta.' : 'No se pudo crear la meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEditMode ? '✏️ Editar Meta' : '🎯 Nueva Meta'}</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={[styles.input, neuInset(scheme), { color: colors.textPrimary }]} value={name} onChangeText={setName} placeholder="Ej: Viaje a Cartagena" placeholderTextColor="#999" />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput style={[styles.input, neuInset(scheme), { color: colors.textPrimary }]} value={description} onChangeText={setDescription} placeholder="¿Por qué es importante?" placeholderTextColor="#999" multiline />

        <Text style={styles.label}>Costo estimado ($)</Text>
        <TextInput style={[styles.input, neuInset(scheme), { color: colors.textPrimary }]} value={displayAmount} onChangeText={(t) => setDisplayAmount(formatWithThousands(t.replace(/[^0-9]/g, '')))} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" />

        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.row}>
          {([['high','Alta'],['medium','Media'],['low','Baja']] as [GoalPriority,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[styles.chip, neuSurface(scheme, 'flat'), { borderRadius: 20 }, priority===k && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }]} onPress={() => setPriority(k)}>
              <Text style={[styles.chipText, { color: priority===k ? colors.textInverse : colors.textSecondary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, neuSurface(scheme, 'flat'), { borderRadius: 20 }, type==='personal' && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }]} onPress={() => setType('personal')}>
            <Text style={[styles.chipText, { color: type==='personal' ? colors.textInverse : colors.textSecondary }]}>👤 Personal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, neuSurface(scheme, 'flat'), { borderRadius: 20 }, type==='couple' && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }]} onPress={() => setType('couple')}>
            <Text style={[styles.chipText, { color: type==='couple' ? colors.textInverse : colors.textSecondary }]}>👥 Pareja</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Frecuencia de ahorro</Text>
        <View style={styles.row}>
          {([['weekly','Semanal'],['biweekly','Quincenal'],['monthly','Mensual']] as [InstallmentFrequency,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[styles.chip, neuSurface(scheme, 'flat'), { borderRadius: 20 }, frequency===k && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }]} onPress={() => setFrequency(k)}>
              <Text style={[styles.chipText, { color: frequency===k ? colors.textInverse : colors.textSecondary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Fecha objetivo</Text>
        <TouchableOpacity style={[styles.dateBtn, neuInset(scheme)]} onPress={() => setShowDate(!showDate)}>
          <Text style={styles.dateBtnText}>{formattedDate}</Text>
          <Text style={styles.dateBtnIcon}>{showDate ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDate && (
          <CyclicDatePicker
            year={year}
            month={month}
            day={day}
            onChangeYear={setYear}
            onChangeMonth={setMonth}
            onChangeDay={setDay}
          />
        )}

        <TouchableOpacity style={[styles.submitBtn, neuShadow(scheme, 'raised'), saving && {opacity:0.6}]} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear meta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.secondary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.secondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  chipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  dateBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBtnText: { fontSize: 16, color: colors.secondary },
  dateBtnIcon: { fontSize: 12, color: '#999' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelText: { fontSize: 16, fontWeight: '500', color: '#666' },
});
