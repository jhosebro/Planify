import React, { useMemo, useState } from 'react';
import { colors } from '@/theme';
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
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej: Viaje a Cartagena" placeholderTextColor="#999" />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="¿Por qué es importante?" placeholderTextColor="#999" multiline />

        <Text style={styles.label}>Costo estimado ($)</Text>
        <TextInput style={styles.input} value={displayAmount} onChangeText={(t) => setDisplayAmount(formatWithThousands(t.replace(/[^0-9]/g, '')))} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" />

        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.row}>
          {([['high','Alta'],['medium','Media'],['low','Baja']] as [GoalPriority,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[styles.chip, priority===k && styles.chipActive]} onPress={() => setPriority(k)}>
              <Text style={[styles.chipText, priority===k && styles.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, type==='personal' && styles.chipActive]} onPress={() => setType('personal')}>
            <Text style={[styles.chipText, type==='personal' && styles.chipTextActive]}>👤 Personal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, type==='couple' && styles.chipActive]} onPress={() => setType('couple')}>
            <Text style={[styles.chipText, type==='couple' && styles.chipTextActive]}>👥 Pareja</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Frecuencia de ahorro</Text>
        <View style={styles.row}>
          {([['weekly','Semanal'],['biweekly','Quincenal'],['monthly','Mensual']] as [InstallmentFrequency,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[styles.chip, frequency===k && styles.chipActive]} onPress={() => setFrequency(k)}>
              <Text style={[styles.chipText, frequency===k && styles.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Fecha objetivo</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(!showDate)}>
          <Text style={styles.dateBtnText}>{formattedDate}</Text>
          <Text style={styles.dateBtnIcon}>{showDate ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDate && (
          <View style={styles.datePicker}>
            <DateRow label="Año" value={year.toString()} onPrev={() => setYear(year-1)} onNext={() => setYear(year+1)} />
            <DateRow label="Mes" value={MONTHS[month]} onPrev={() => { if(month===0){setMonth(11);setYear(year-1)}else setMonth(month-1)}} onNext={() => {if(month===11){setMonth(0);setYear(year+1)}else setMonth(month+1)}} />
            <DateRow label="Día" value={day.toString()} onPrev={() => setDay(Math.max(1,day-1))} onNext={() => setDay(Math.min(daysInMonth,day+1))} />
          </View>
        )}

        <TouchableOpacity style={[styles.submitBtn, saving && {opacity:0.6}]} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear meta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DateRow({ label, value, onPrev, onNext }: { label: string; value: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateControls}>
        <TouchableOpacity style={styles.dateArrow} onPress={onPrev}><Text style={styles.dateArrowText}>◀</Text></TouchableOpacity>
        <Text style={styles.dateValue}>{value}</Text>
        <TouchableOpacity style={styles.dateArrow} onPress={onNext}><Text style={styles.dateArrowText}>▶</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.secondary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#DDD', color: colors.secondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  dateBtn: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#DDD', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBtnText: { fontSize: 16, color: colors.secondary },
  dateBtnIcon: { fontSize: 12, color: '#999' },
  datePicker: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#EEE' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dateLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  dateControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dateArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundPrimary, alignItems: 'center', justifyContent: 'center' },
  dateArrowText: { fontSize: 14, color: colors.primary },
  dateValue: { fontSize: 16, fontWeight: '600', color: colors.secondary, minWidth: 80, textAlign: 'center' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelText: { fontSize: 16, fontWeight: '500', color: '#666' },
});
