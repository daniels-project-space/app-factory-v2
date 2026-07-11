// ReviewPulse — Send Review Request Screen
// Sprint 7: Bottom sheet modal — customer input, template selector, SMS preview, quota, send
// Opens from FAB on home/reviews tab or action card

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Send,
  Check,
  ChevronDown,
  ChevronLeft,
  MessageSquare,
  X,
  Users,
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
  SpringConfigs,
} from '@/constants';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useDemoStore } from '@/store/demo';

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  opted_out: boolean;
  request_count: number;
  last_request_at: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
  body: string;
};

type SendState = 'idle' | 'sending' | 'success' | 'error';

// ─── System Templates ─────────────────────────────────────────────────────────

const SYSTEM_TEMPLATES: TemplateOption[] = [
  {
    id: 'default',
    name: 'Standard',
    body: 'Hi {customer_name}, thanks for choosing {business_name}! We\'d love a quick review: {review_link} — Reply STOP to opt out.',
  },
  {
    id: 'short',
    name: 'Short & Sweet',
    body: 'Hi {customer_name}, mind leaving us a review? {review_link} — Reply STOP to opt out.',
  },
  {
    id: 'grateful',
    name: 'Grateful',
    body: 'Hi {customer_name}, thank you for trusting {business_name} with your business! If you have a moment, a review would mean the world: {review_link} — Reply STOP to opt out.',
  },
  {
    id: 'hipaa',
    name: 'HIPAA-Aware',
    body: 'Hi {customer_name}, thank you for visiting {business_name}. We\'d appreciate your feedback: {review_link} — Reply STOP to opt out.',
  },
  {
    id: 'post_job',
    name: 'Post-Job',
    body: 'Hi {customer_name}, we hope everything looks great! If you\'re happy with the work, a review helps us grow: {review_link} — Reply STOP to opt out.',
  },
];

const FREE_SMS_LIMIT = 5;

// ─── Phone formatting ─────────────────────────────────────────────────────────

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 10);
}

// ─── Segmented Control ────────────────────────────────────────────────────────

function SegmentedControl({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: number;
  onSelect: (idx: number) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const slideAnim = useRef(new Animated.Value(selected)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selected,
      useNativeDriver: true,
      ...SpringConfigs.tab,
    }).start();
  }, [selected, slideAnim]);

  const tabWidth = containerWidth / options.length;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        height: 40,
        flexDirection: 'row',
        backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
        borderRadius: Radius.md,
        padding: 3,
      }}
    >
      {/* Animated indicator */}
      {containerWidth > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: 3,
            width: tabWidth - 6,
            borderRadius: Radius.md - 2,
            backgroundColor: Colors.primary[500],
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: options.map((_, i) => i),
                  outputRange: options.map((_, i) => i * tabWidth),
                }),
              },
            ],
          }}
        />
      )}
      {options.map((label, idx) => (
        <Pressable
          key={label}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(idx);
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text
            style={[
              Typography.label,
              {
                fontSize: 13,
                color: selected === idx ? '#FFFFFF' : theme.textSecondary,
              },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Contact Row ──────────────────────────────────────────────────────────────

function ContactRow({
  customer,
  isSelected,
  onSelect,
}: {
  customer: Customer;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const initials = customer.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Hash name to avatar color
  let hash = 0;
  for (let i = 0; i < customer.name.length; i++) {
    hash = customer.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const avatarColors = [
    Colors.primary[700], Colors.primary[500], Colors.slate[700],
    Colors.slate[500], '#6D5ACF', '#BE4B48', '#3D7EAA', '#5C6BC0',
  ];
  const avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        backgroundColor: pressed
          ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
          : 'transparent',
        opacity: customer.opted_out ? 0.5 : 1,
      })}
    >
      {/* Avatar */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: avatarBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: 'Barlow-Condensed-Bold',
            fontSize: 14,
            color: '#FFFFFF',
          }}
        >
          {initials}
        </Text>
      </View>

      {/* Name + phone */}
      <View style={{ flex: 1 }}>
        <Text style={[Typography.h4, { color: theme.textPrimary, fontSize: 15 }]}>
          {customer.name}
        </Text>
        <Text style={[Typography.caption, { color: theme.textTertiary }]}>
          {customer.phone ?? 'No phone'}
          {customer.opted_out ? ' · OPTED OUT' : ''}
        </Text>
      </View>

      {/* Selection indicator */}
      {isSelected && (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: Colors.accent[300],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={14} color={Colors.primary[900]} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  selected,
  onSelect,
  expanded,
  onToggle,
}: {
  templates: TemplateOption[];
  selected: string;
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  const current = templates.find((t) => t.id === selected) ?? templates[0];

  return (
    <View>
      {/* Selected template card */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
          borderRadius: Radius.sm,
          padding: 12,
          paddingHorizontal: Spacing.md,
          gap: Spacing.sm,
        }}
      >
        <MessageSquare
          size={16}
          color={theme.textTertiary}
          strokeWidth={2}
        />
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodySm, { color: theme.textPrimary, fontFamily: 'Source-Sans-SemiBold' }]}>
            {current.name}
          </Text>
          <Text
            style={[Typography.caption, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {current.body.slice(0, 45)}...
          </Text>
        </View>
        <ChevronDown
          size={16}
          color={theme.textTertiary}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Expanded template list */}
      {expanded && (
        <View
          style={{
            marginTop: Spacing.xs,
            backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
            borderRadius: Radius.sm,
            overflow: 'hidden',
          }}
        >
          {templates.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(t.id);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                paddingHorizontal: Spacing.md,
                backgroundColor:
                  t.id === selected
                    ? isDark ? Colors.primary[900] : Colors.primary[50]
                    : pressed
                      ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
                      : 'transparent',
                borderBottomWidth: t.id === templates[templates.length - 1].id ? 0 : 1,
                borderBottomColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    Typography.bodySm,
                    {
                      color: theme.textPrimary,
                      fontFamily: t.id === selected ? 'Source-Sans-SemiBold' : 'Source-Sans-Regular',
                    },
                  ]}
                >
                  {t.name}
                </Text>
              </View>
              {t.id === selected && (
                <Check size={16} color={Colors.primary[500]} strokeWidth={2.5} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── SMS Bubble Preview ───────────────────────────────────────────────────────

function SMSBubble({ text, charCount }: { text: string; charCount: number }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <View>
      <Text style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
        PREVIEW
      </Text>
      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#34C759',
            borderRadius: 18,
            borderBottomRightRadius: 4,
            paddingVertical: 10,
            paddingHorizontal: 14,
            maxWidth: '88%',
          }}
        >
          <Text
            style={{
              fontFamily: 'Source-Sans-Regular',
              fontSize: 15,
              lineHeight: 21,
              color: '#FFFFFF',
            }}
          >
            {text || 'Your message preview will appear here...'}
          </Text>
        </View>
      </View>
      <Text
        style={[
          Typography.caption,
          {
            color: charCount > 160 ? Colors.warning[500] : theme.textTertiary,
            textAlign: 'right',
            marginTop: Spacing.xs,
          },
        ]}
      >
        {charCount} / 160 chars{charCount > 160 ? ' (2 segments)' : ''}
      </Text>
    </View>
  );
}

// ─── Quota Display ────────────────────────────────────────────────────────────

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const remaining = Math.max(0, limit - used);
  const fillPct = Math.min(100, (used / limit) * 100);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      }}
    >
      <View
        style={{
          flex: 1,
          height: 4,
          backgroundColor: isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${fillPct}%`,
            height: '100%',
            backgroundColor:
              remaining <= 1
                ? Colors.warning[500]
                : Colors.primary[500],
            borderRadius: 2,
          }}
        />
      </View>
      <Text
        style={[
          Typography.caption,
          {
            color: remaining <= 1 ? Colors.warning[500] : theme.textSecondary,
            minWidth: 90,
            textAlign: 'right',
          },
        ]}
      >
        {remaining} of {limit} remaining
      </Text>
    </View>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ customerName, onDismiss }: { customerName: string; onDismiss: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...SpringConfigs.bouncy,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.primary[500],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: opacityAnim,
        zIndex: 100,
        borderRadius: Radius.xl,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.lg,
          }}
        >
          <Check size={40} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text
          style={[
            Typography.h2,
            { color: '#FFFFFF', textAlign: 'center', marginBottom: Spacing.xs },
          ]}
        >
          REQUEST SENT!
        </Text>
        <Text
          style={[
            Typography.body,
            { color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
          ]}
        >
          {customerName}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SendRequestScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);
  const demoActive = useDemoStore((s) => s.active);
  const demoCustomers = useDemoStore((s) => s.getCustomers);

  // State
  const [mode, setMode] = useState(0); // 0 = contacts, 1 = new
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templateExpanded, setTemplateExpanded] = useState(false);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Error toast animation
  const errorSlide = useRef(new Animated.Value(-80)).current;

  // ─── Data Loading ───────────────────────────────────────────────────────────

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadData = async () => {
    if (!user) return;
    try {
      // Load customers
      const { data: customerData, error: custErr } = await supabase
        .from('customers')
        .select('id, name, phone, opted_out, request_count, last_request_at')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (!custErr && customerData && customerData.length > 0) {
        setCustomers(customerData as Customer[]);
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
      setLoadingCustomers(false);

      // Load profile for quota + business name
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_pro, sms_quota_used, business_name')
        .eq('id', user.id)
        .single();

      if (!profileErr && profile) {
        setIsPro(profile.is_pro);
        setQuotaUsed(profile.sms_quota_used);
        setBusinessName(profile.business_name ?? '');
      }
    } catch {
      setLoadingCustomers(false);
    }
  };

  // ─── Filtered Customers ────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
    );
  }, [customers, searchQuery]);

  // ─── Preview Message ───────────────────────────────────────────────────────

  const previewMessage = useMemo(() => {
    const template = SYSTEM_TEMPLATES.find((t) => t.id === selectedTemplate) ?? SYSTEM_TEMPLATES[0];
    const name = mode === 0
      ? selectedCustomer?.name ?? 'Customer'
      : newName.trim() || 'Customer';
    const firstName = name.split(' ')[0];

    return template.body
      .replace(/{customer_name}/g, firstName)
      .replace(/{business_name}/g, businessName || 'your business')
      .replace(/{review_link}/g, 'g.page/r/...');
  }, [selectedTemplate, mode, selectedCustomer, newName, businessName]);

  // ─── Can Send? ─────────────────────────────────────────────────────────────

  const canSend = useMemo(() => {
    if (sendState !== 'idle') return false;
    if (!isPro && quotaUsed >= FREE_SMS_LIMIT) return false;

    if (mode === 0) {
      return selectedCustomer !== null && selectedCustomer.phone && !selectedCustomer.opted_out;
    } else {
      return newName.trim().length > 0 && extractDigits(newPhone).length === 10;
    }
  }, [mode, selectedCustomer, newName, newPhone, sendState, isPro, quotaUsed]);

  // ─── Send Handler ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!canSend || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setSendState('sending');

    try {
      const customerName = mode === 0
        ? selectedCustomer!.name
        : newName.trim();
      const rawPhone = mode === 0
        ? selectedCustomer!.phone!
        : extractDigits(newPhone);
      // Normalize to E.164: 10 US digits get +1 prefix, already E.164 pass through, else reject
      const digits = rawPhone.replace(/\D/g, '');
      const customerPhone = digits.length === 10
        ? `+1${digits}`
        : rawPhone.match(/^\+\d{10,15}$/) ? rawPhone : null;
      if (!customerPhone) {
        setSendState('idle');
        Alert.alert('Invalid phone number', 'Please enter a valid 10-digit US phone number.');
        return;
      }
      const customerId = mode === 0 ? selectedCustomer!.id : undefined;

      if (demoActive) {
        // Demo mode: simulate sending
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setQuotaUsed((prev) => prev + 1);
        setSendState('success');
      } else {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_id: customerId,
            template_id: selectedTemplate,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to send');
        }

        const result = data as { success: boolean; error?: string; quota_used?: number };

        if (!result.success) {
          throw new Error(result.error ?? 'Unknown error');
        }

        // Update quota
        if (result.quota_used !== undefined) {
          setQuotaUsed(result.quota_used);
        }

        setSendState('success');
      }
    } catch (err) {
      setSendState('error');
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Show error toast
      Animated.sequence([
        Animated.timing(errorSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(errorSlide, { toValue: -80, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setSendState('idle');
      });
    }
  };

  // ─── Success dismiss ───────────────────────────────────────────────────────

  const handleSuccessDismiss = () => {
    router.back();
  };

  // ─── Derive customer name for display ──────────────────────────────────────

  const displayName = mode === 0
    ? selectedCustomer?.name ?? ''
    : newName.trim();

  // ─── Button label ──────────────────────────────────────────────────────────

  const buttonLabel = useMemo(() => {
    if (sendState === 'sending') return 'SENDING...';
    if (!isPro) {
      const remaining = FREE_SMS_LIMIT - quotaUsed;
      return `SEND (${remaining} OF ${FREE_SMS_LIMIT} REMAINING)`;
    }
    return 'SEND MESSAGE';
  }, [sendState, isPro, quotaUsed]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Error toast */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            transform: [{ translateY: errorSlide }],
          }}
        >
          <View
            style={{
              backgroundColor: Colors.error[500],
              paddingVertical: Spacing.md,
              paddingHorizontal: Layout.screenPaddingH,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
            }}
          >
            <X size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={[Typography.bodySm, { color: '#FFFFFF', flex: 1 }]}>
              {errorMessage}
            </Text>
          </View>
        </Animated.View>

        {/* Success overlay */}
        {sendState === 'success' && (
          <SuccessOverlay customerName={displayName} onDismiss={handleSuccessDismiss} />
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing.md,
            }}
          >
            {/* Back + Title */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Spacing.lg,
              }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
                hitSlop={12}
                style={{ marginRight: Spacing.sm }}
              >
                <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h2, { color: theme.textPrimary }]}>
                  SEND REVIEW REQUEST
                </Text>
                <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                  Customers reply 8x more to texts than emails
                </Text>
              </View>
            </View>

            {/* Segmented control */}
            <SegmentedControl
              options={['FROM CONTACTS', 'NEW CUSTOMER']}
              selected={mode}
              onSelect={(idx) => {
                setMode(idx);
                setSelectedCustomer(null);
              }}
            />
          </View>

          {/* ─── Contact selection mode ─────────────────────────────────────── */}
          {mode === 0 && (
            <View style={{ paddingHorizontal: Layout.screenPaddingH, marginTop: Spacing.md }}>
              <Input
                variant="search"
                placeholder="Search customers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View
                style={{
                  marginTop: Spacing.sm,
                  backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                  borderRadius: Radius.md,
                  maxHeight: 240,
                  overflow: 'hidden',
                  ...(isDark
                    ? { borderWidth: 1, borderColor: DarkTheme.borderDefault }
                    : Shadows.sm),
                }}
              >
                {loadingCustomers ? (
                  <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                    <ActivityIndicator color={Colors.primary[500]} />
                  </View>
                ) : filteredCustomers.length === 0 ? (
                  <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                    <Users size={28} color={theme.textTertiary} strokeWidth={1.5} />
                    <Text
                      style={[
                        Typography.bodySm,
                        { color: theme.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
                      ]}
                    >
                      {searchQuery ? 'No matches found' : 'No saved customers yet'}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setMode(1);
                        setSearchQuery('');
                      }}
                      style={{ marginTop: Spacing.sm }}
                    >
                      <Text
                        style={[
                          Typography.buttonSm,
                          { color: Colors.primary[500] },
                        ]}
                      >
                        + ADD NEW CUSTOMER
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <FlatList
                    data={filteredCustomers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <ContactRow
                        customer={item}
                        isSelected={selectedCustomer?.id === item.id}
                        onSelect={() => {
                          if (item.opted_out) return;
                          setSelectedCustomer(
                            selectedCustomer?.id === item.id ? null : item
                          );
                        }}
                      />
                    )}
                    scrollEnabled
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: theme.borderDefault,
                          marginLeft: Spacing.md + 36 + Spacing.sm,
                        }}
                      />
                    )}
                  />
                )}
              </View>
            </View>
          )}

          {/* ─── New customer mode ─────────────────────────────────────────── */}
          {mode === 1 && (
            <View
              style={{
                paddingHorizontal: Layout.screenPaddingH,
                marginTop: Spacing.md,
                gap: Spacing.md,
              }}
            >
              <Input
                label="CUSTOMER NAME"
                placeholder="John Smith"
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
              />
              <Input
                variant="phone"
                label="PHONE NUMBER"
                placeholder="(555) 123-4567"
                value={formatPhoneDisplay(newPhone)}
                onChangeText={(text) => setNewPhone(extractDigits(text))}
                error={
                  newPhone.length > 0 && extractDigits(newPhone).length < 10
                    ? 'Enter a valid 10-digit phone number'
                    : undefined
                }
              />

              {/* Save to contacts toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={[Typography.bodySm, { color: theme.textSecondary }]}>
                  Save to contacts
                </Text>
                <Switch
                  value={saveToContacts}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    setSaveToContacts(val);
                  }}
                  trackColor={{
                    false: isDark ? DarkTheme.bgSurface3 : Colors.neutral[200],
                    true: Colors.primary[300],
                  }}
                  thumbColor={saveToContacts ? Colors.primary[500] : Colors.neutral[400]}
                />
              </View>
            </View>
          )}

          {/* ─── Template selector ─────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: Layout.screenPaddingH, marginTop: Spacing.lg }}>
            <Text
              style={[
                Typography.label,
                { color: theme.textSecondary, marginBottom: Spacing.xs },
              ]}
            >
              MESSAGE TEMPLATE
            </Text>
            <TemplatePicker
              templates={SYSTEM_TEMPLATES}
              selected={selectedTemplate}
              onSelect={(id) => {
                setSelectedTemplate(id);
                setTemplateExpanded(false);
              }}
              expanded={templateExpanded}
              onToggle={() => setTemplateExpanded(!templateExpanded)}
            />
          </View>

          {/* ─── SMS Preview ───────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: Layout.screenPaddingH, marginTop: Spacing.lg }}>
            <SMSBubble text={previewMessage} charCount={previewMessage.length} />
          </View>

          {/* ─── Quota bar (free tier only) ────────────────────────────────── */}
          {!isPro && (
            <View style={{ paddingHorizontal: Layout.screenPaddingH, marginTop: Spacing.lg }}>
              <QuotaBar used={quotaUsed} limit={FREE_SMS_LIMIT} />
            </View>
          )}
        </ScrollView>

        {/* ─── Send button (pinned to bottom) ──────────────────────────────── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: Layout.screenPaddingH,
            paddingBottom: Spacing.xl,
            paddingTop: Spacing.md,
            backgroundColor: theme.bgBase,
            borderTopWidth: 1,
            borderTopColor: theme.borderDefault,
          }}
        >
          <Button
            label={buttonLabel}
            onPress={handleSend}
            variant="primary"
            fullWidth
            disabled={!canSend}
            loading={sendState === 'sending'}
            icon={
              sendState !== 'sending' ? (
                <Send size={18} color="#FFFFFF" strokeWidth={2} />
              ) : undefined
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
