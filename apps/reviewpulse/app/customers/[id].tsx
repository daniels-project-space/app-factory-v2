// ReviewPulse — Customer Detail Screen
// Sprint 11: Shows customer info, request history, edit/delete actions
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ChevronLeft,
  Send,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Edit3,
  Save,
  Ban,
  Tag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { getAvatarColor } from '@/constants/colors';
import { Skeleton } from '@/components/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  tags: string[];
  opted_out: boolean;
  opted_out_at: string | null;
  total_requests_sent: number;
  last_request_at: string | null;
  created_at: string;
};

type RequestRecord = {
  id: string;
  to_name: string | null;
  delivery_status: string;
  message_body: string;
  sent_at: string | null;
  created_at: string;
};

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  sent: { bg: Colors.primary[50], text: Colors.primary[700], icon: Send, label: 'Sent' },
  delivered: { bg: Colors.success[100], text: Colors.success[700], icon: CheckCircle, label: 'Delivered' },
  failed: { bg: Colors.error[100], text: Colors.error[700], icon: XCircle, label: 'Failed' },
  pending: { bg: Colors.warning[100], text: Colors.warning[700], icon: Clock, label: 'Pending' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = c.icon;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full }}>
      <Icon size={11} color={c.text} strokeWidth={2} />
      <Text style={{ fontFamily: 'Barlow-Condensed-SemiBold', fontSize: 10, color: c.text, letterSpacing: 0.3, textTransform: 'uppercase' }}>{c.label}</Text>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  return (
    <View style={{
      flex: 1,
      backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
      borderRadius: Radius.sm,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
    }}>
      <Text style={[Typography.h3, { color: theme.textPrimary, fontSize: 20 }]}>{value}</Text>
      <Text style={[Typography.caption, { color: theme.textTertiary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

// ─── Time Ago ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);
  const demoActive = useDemoStore((s) => s.active);
  const demoCustomers = useDemoStore((s) => s.getCustomers);
  const demoRequests = useDemoStore((s) => s.getRequests);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [custRes, reqRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).eq('user_id', user!.id).single(),
        supabase.from('review_requests').select('id, to_name, delivery_status, message_body, sent_at, created_at')
          .eq('customer_id', id).order('created_at', { ascending: false }).limit(30),
      ]);
      if (custRes.data) {
        const c = custRes.data as CustomerDetail;
        setCustomer(c);
        setEditName(c.name);
        setEditNotes(c.notes ?? '');
      }
      if (reqRes.data && reqRes.data.length > 0) {
        setRequests(reqRes.data as RequestRecord[]);
      } else if (demoActive) {
        // Fallback: use demo request data
        const demoReqs = demoRequests(id) as unknown as RequestRecord[];
        setRequests(demoReqs);
      }

      // If no customer from Supabase, try demo data
      if (!custRes.data && demoActive) {
        const dc = demoCustomers().find((c) => c.id === id);
        if (dc) {
          setCustomer({
            id: dc.id,
            name: dc.name,
            phone: dc.phone,
            notes: dc.notes,
            tags: dc.tags,
            opted_out: dc.opted_out,
            opted_out_at: dc.opted_out_at,
            total_requests_sent: dc.total_requests_sent,
            last_request_at: dc.last_request_at,
            created_at: dc.created_at,
          });
          setEditName(dc.name);
          setEditNotes(dc.notes ?? '');
          const demoReqs = demoRequests(id) as unknown as RequestRecord[];
          setRequests(demoReqs);
        }
      }
    } catch {
      // Fallback to demo data on error
      if (demoActive) {
        const dc = demoCustomers().find((c) => c.id === id);
        if (dc) {
          setCustomer({
            id: dc.id,
            name: dc.name,
            phone: dc.phone,
            notes: dc.notes,
            tags: dc.tags,
            opted_out: dc.opted_out,
            opted_out_at: dc.opted_out_at,
            total_requests_sent: dc.total_requests_sent,
            last_request_at: dc.last_request_at,
            created_at: dc.created_at,
          });
          setEditName(dc.name);
          setEditNotes(dc.notes ?? '');
          const demoReqs = demoRequests(id) as unknown as RequestRecord[];
          setRequests(demoReqs);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, id, demoActive, demoCustomers, demoRequests]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!customer || !user || saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase.from('customers').update({
        name: editName.trim() || customer.name,
        notes: editNotes.trim() || null,
      }).eq('id', customer.id).eq('user_id', user.id);
      if (error) {
        Alert.alert('Save failed', 'Could not update customer. Please try again.');
        return;
      }
      setCustomer({ ...customer, name: editName.trim() || customer.name, notes: editNotes.trim() || null });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!customer) return;
    Alert.alert(
      'Delete Customer',
      `Remove ${customer.name} from your contacts? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await supabase.from('customers').delete().eq('id', customer.id).eq('user_id', user!.id);
            if (!error) router.back();
          },
        },
      ]
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading || !customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
        <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>
          <Text style={[Typography.h2, { color: theme.textPrimary, marginLeft: Spacing.sm }]}>CUSTOMER</Text>
        </View>
        {/* Skeleton loading */}
        <View style={{ padding: Layout.screenPaddingH, gap: Spacing.md, marginTop: Spacing.lg }}>
          <View style={{ backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF', borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : {}) }}>
            <Skeleton width={56} height={56} borderRadius={28} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Skeleton width={140} height={18} />
              <Skeleton width={100} height={14} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="33%" height={60} borderRadius={Radius.md} style={{ flex: 1 }} />
            ))}
          </View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} borderRadius={Radius.md} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const initials = customer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarBg = getAvatarColor(customer.name);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={12}>
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>
          <Text style={[Typography.h2, { color: theme.textPrimary, flex: 1, marginLeft: Spacing.sm }]}>CUSTOMER</Text>
          {editing ? (
            <Pressable onPress={handleSave} hitSlop={12} disabled={saving} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: saving ? 0.5 : 1 }}>
              <Save size={18} color={Colors.accent[300]} strokeWidth={2} />
              <Text style={[Typography.label, { color: Colors.accent[300] }]}>{saving ? 'SAVING...' : 'SAVE'}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(true); }} hitSlop={12}>
              <Edit3 size={20} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: Layout.screenPaddingH }}>
              {/* Profile card */}
              <View style={{
                backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                borderRadius: Radius.md,
                padding: Spacing.lg,
                alignItems: 'center',
                ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : Shadows.sm),
              }}>
                {/* Avatar */}
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: avatarBg,
                  alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
                }}>
                  <Text style={{ fontFamily: 'Barlow-Condensed-ExtraBold', fontSize: 24, color: '#FFFFFF' }}>{initials}</Text>
                </View>

                {editing ? (
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={[Typography.h2, {
                      color: theme.textPrimary,
                      textAlign: 'center',
                      borderBottomWidth: 2,
                      borderBottomColor: Colors.accent[300],
                      paddingBottom: 4,
                      minWidth: 150,
                    }]}
                    autoFocus
                  />
                ) : (
                  <Text style={[Typography.h2, { color: theme.textPrimary, textAlign: 'center' }]}>{customer.name}</Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs }}>
                  <Phone size={13} color={theme.textTertiary} strokeWidth={2} />
                  <Text style={[Typography.body, { color: theme.textSecondary }]}>{customer.phone}</Text>
                </View>

                {customer.opted_out && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm,
                    backgroundColor: Colors.error[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
                  }}>
                    <Ban size={12} color={Colors.error[700]} strokeWidth={2} />
                    <Text style={{ fontFamily: 'Barlow-Condensed-SemiBold', fontSize: 11, color: Colors.error[700], textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Opted Out {customer.opted_out_at ? `· ${timeAgo(customer.opted_out_at)}` : ''}
                    </Text>
                  </View>
                )}

                {/* Stats row */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, width: '100%' }}>
                  <StatPill label="Requests" value={String(customer.total_requests_sent)} isDark={isDark} />
                  <StatPill label="Last Sent" value={timeAgo(customer.last_request_at)} isDark={isDark} />
                  <StatPill label="Added" value={timeAgo(customer.created_at)} isDark={isDark} />
                </View>

                {/* Notes */}
                {editing ? (
                  <View style={{ width: '100%', marginTop: Spacing.md }}>
                    <Text style={[Typography.label, { color: theme.textSecondary, marginBottom: 4 }]}>NOTES</Text>
                    <TextInput
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Add notes about this customer..."
                      placeholderTextColor={theme.textTertiary}
                      multiline
                      style={[Typography.bodySm, {
                        color: theme.textPrimary,
                        backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
                        borderRadius: Radius.sm,
                        padding: Spacing.md,
                        minHeight: 60,
                        textAlignVertical: 'top',
                      }]}
                    />
                  </View>
                ) : customer.notes ? (
                  <View style={{ width: '100%', marginTop: Spacing.md }}>
                    <Text style={[Typography.label, { color: theme.textSecondary, marginBottom: 4 }]}>NOTES</Text>
                    <Text style={[Typography.bodySm, { color: theme.textSecondary }]}>{customer.notes}</Text>
                  </View>
                ) : null}

                {/* Tags */}
                {customer.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md, width: '100%' }}>
                    {customer.tags.map((tag) => (
                      <View key={tag} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 3,
                        backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
                      }}>
                        <Tag size={10} color={Colors.primary[500]} strokeWidth={2} />
                        <Text style={{ fontFamily: 'Source-Sans-Regular', fontSize: 12, color: Colors.primary[500] }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                {!customer.opted_out && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push('/request/new');
                    }}
                    style={({ pressed }) => ({
                      flex: 1, height: 44, borderRadius: Radius.sm,
                      backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
                    })}
                  >
                    <Send size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={[Typography.buttonSm, { color: '#FFFFFF' }]}>SEND REQUEST</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => ({
                    width: 44, height: 44, borderRadius: Radius.sm,
                    backgroundColor: pressed ? Colors.error[100] : isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
                    alignItems: 'center', justifyContent: 'center',
                  })}
                >
                  <Trash2 size={18} color={Colors.error[500]} strokeWidth={2} />
                </Pressable>
              </View>

              {/* Request history header */}
              <Text style={[Typography.label, { color: theme.textSecondary, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>
                REQUEST HISTORY ({requests.length})
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{
              marginHorizontal: Layout.screenPaddingH,
              backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
              borderRadius: Radius.sm,
              padding: Spacing.md,
              marginBottom: Spacing.xs,
              ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : Shadows.sm),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[Typography.caption, { color: theme.textTertiary }]}>{timeAgo(item.sent_at ?? item.created_at)}</Text>
                <StatusBadge status={item.delivery_status} />
              </View>
              <Text style={[Typography.bodySm, { color: theme.textSecondary }]} numberOfLines={2}>{item.message_body}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingVertical: Spacing.xl, alignItems: 'center' }}>
              <Clock size={28} color={theme.textTertiary} strokeWidth={1.5} />
              <Text style={[Typography.bodySm, { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.sm }]}>
                No requests sent to this customer yet
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
