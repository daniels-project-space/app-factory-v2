// ReviewPulse — Customers Tab
// Sprint 11: Customer list with CSV import, detail navigation, templates link
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Plus,
  Phone,
  Upload,
  MessageSquare,
  ChevronRight,
  UserPlus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  Radius,
  Layout,
  Shadows,
} from '@/constants';
import { SkeletonList } from '@/components/shared/SkeletonLoader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { getAvatarColor } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  opted_out: boolean;
  request_count: number;
  last_request_at: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize phone strings to E.164 (assumes US +1 if no country code) */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits || digits.length < 7) return null;
  // Already has +
  if (digits.startsWith('+')) return digits;
  // 10-digit US
  if (digits.length === 10) return `+1${digits}`;
  // 11-digit starting with 1
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

// ─── Customer Row ─────────────────────────────────────────────────────────────

function CustomerRow({ customer }: { customer: Customer }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const initials = customer.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatarBg = getAvatarColor(customer.name);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/customers/${customer.id}`);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Layout.screenPaddingH,
        backgroundColor: pressed
          ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
          : 'transparent',
        opacity: customer.opted_out ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: avatarBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Spacing.sm,
        }}
      >
        <Text style={{ fontFamily: 'Barlow-Condensed-Bold', fontSize: 15, color: '#FFFFFF' }}>
          {initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[Typography.h4, { color: theme.textPrimary }]}>
          {customer.name}
          {customer.opted_out && (
            <Text style={{ color: Colors.error[500], fontSize: 12 }}> · OPTED OUT</Text>
          )}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Phone size={11} color={theme.textTertiary} strokeWidth={2} />
          <Text style={[Typography.caption, { color: theme.textTertiary }]}>
            {customer.phone ?? 'No phone'}
          </Text>
          {customer.request_count > 0 && (
            <Text style={[Typography.caption, { color: theme.textTertiary }]}>
              {' '}· {customer.request_count} sent
            </Text>
          )}
        </View>
      </View>

      <ChevronRight size={18} color={theme.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomersScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);
  const demoActive = useDemoStore((s) => s.active);
  const demoCustomers = useDemoStore((s) => s.getCustomers);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, opted_out, request_count, last_request_at')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        setCustomers(data as Customer[]);
      } else if (demoActive) {
        // Fallback to demo data
        const dc = demoCustomers().map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          opted_out: c.opted_out,
          request_count: c.request_count,
          last_request_at: c.last_request_at,
        }));
        setCustomers(dc);
      }
    } catch {
      // Fallback to demo data on error
      if (demoActive) {
        const dc = demoCustomers().map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          opted_out: c.opted_out,
          request_count: c.request_count,
          last_request_at: c.last_request_at,
        }));
        setCustomers(dc);
      }
    } finally {
      setLoading(false);
    }
  }, [user, demoActive, demoCustomers]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  // ─── CSV Import ───────────────────────────────────────────────────────────

  const handleCSVImport = async () => {
    if (!user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

      if (!parsed.data || parsed.data.length === 0) {
        Alert.alert('Import Failed', 'No rows found in the CSV file.');
        setImporting(false);
        return;
      }

      const rows = parsed.data as Record<string, string>[];
      const toInsert: { user_id: string; name: string; phone: string }[] = [];

      for (const row of rows) {
        // Flexible column name detection
        const name =
          row['name'] || row['Name'] ||
          row['customer_name'] || row['Customer Name'] ||
          (row['first_name'] || row['First Name'] || '') + ' ' + (row['last_name'] || row['Last Name'] || '');

        const rawPhone =
          row['phone'] || row['Phone'] ||
          row['phone_number'] || row['Phone Number'] ||
          row['mobile'] || row['Mobile'] ||
          row['cell'] || row['Cell'] || '';

        const trimmedName = name.trim();
        const phone = normalizePhone(rawPhone);

        if (trimmedName && phone) {
          toInsert.push({ user_id: user.id, name: trimmedName, phone });
        }
      }

      if (toInsert.length === 0) {
        Alert.alert('Import Failed', 'No valid rows with name and phone found. Columns should include "name" and "phone".');
        setImporting(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .upsert(toInsert, { onConflict: 'user_id,phone' });

      setImporting(false);

      if (error) {
        Alert.alert('Import Error', error.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Import Complete', `${toInsert.length} customer${toInsert.length === 1 ? '' : 's'} imported.`);
        fetchCustomers();
      }
    } catch {
      setImporting(false);
      Alert.alert('Import Error', 'Could not read the CSV file.');
    }
  };

  // ─── Empty State ──────────────────────────────────────────────────────────

  const EmptyCustomers = (
    <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
      <View
        style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
          alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
        }}
      >
        <UserPlus size={24} color={Colors.primary[500]} strokeWidth={1.5} />
      </View>
      <Text style={[Typography.h3, { color: theme.textPrimary, textAlign: 'center', marginBottom: Spacing.xs }]}>
        No Customers Yet
      </Text>
      <Text style={[Typography.bodySm, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg }]}>
        Import a CSV or send your first review request to add customers
      </Text>
      <Pressable
        onPress={handleCSVImport}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
          height: 44, paddingHorizontal: Spacing.lg, borderRadius: Radius.md,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
        })}
      >
        <Upload size={16} color="#FFFFFF" strokeWidth={2} />
        <Text style={[Typography.buttonSm, { color: '#FFFFFF' }]}>IMPORT CSV</Text>
      </Pressable>
    </View>
  );

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.xl }}>
          <Text style={[Typography.h1, { color: theme.textPrimary, marginBottom: Spacing.xl }]}>CUSTOMERS</Text>
        </View>
        <View
          style={{
            backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
            borderRadius: Radius.md, marginHorizontal: Layout.screenPaddingH, overflow: 'hidden',
          }}
        >
          <SkeletonList count={5} type="customer" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
      }}>
        <Text style={[Typography.h1, { color: theme.textPrimary, flex: 1 }]}>CUSTOMERS</Text>

        {/* Templates button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/templates');
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: pressed
              ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
              : isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
            alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xs,
          })}
        >
          <MessageSquare size={18} color={Colors.primary[500]} strokeWidth={2} />
        </Pressable>

        {/* CSV Import button */}
        <Pressable
          onPress={handleCSVImport}
          disabled={importing}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: pressed
              ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
              : isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
            alignItems: 'center', justifyContent: 'center',
          })}
        >
          {importing ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          ) : (
            <Upload size={18} color={Colors.primary[500]} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      {/* Customer count */}
      <View style={{ paddingHorizontal: Layout.screenPaddingH, marginBottom: Spacing.sm }}>
        <Text style={[Typography.caption, { color: theme.textTertiary }]}>
          {customers.length} CONTACT{customers.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      {/* Customer list */}
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
          borderRadius: Radius.md, marginHorizontal: Layout.screenPaddingH, overflow: 'hidden',
          ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : Shadows.sm),
        }}
      >
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CustomerRow customer={item} />}
          ListEmptyComponent={EmptyCustomers}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
              tintColor={Colors.primary[500]} colors={[Colors.primary[500]]} />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.borderDefault, marginLeft: Layout.screenPaddingH + 48 }} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* FAB — Send Request */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/request/new');
        }}
        style={({ pressed }) => ({
          position: 'absolute', bottom: 100, right: Layout.screenPaddingH,
          width: Layout.fabSize, height: Layout.fabSize, borderRadius: Layout.fabSize / 2,
          backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
          alignItems: 'center', justifyContent: 'center',
          ...Shadows.lg,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
  );
}
