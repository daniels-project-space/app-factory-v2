// ReviewPulse — Template List Screen
// Sprint 11: Modal showing system + custom templates, navigate to editor
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  X,
  Plus,
  Lock,
  Edit3,
  Trash2,
  MessageSquare,
  FileText,
  Zap,
  Briefcase,
  Scissors,
  Heart,
  Car,
  UtensilsCrossed,
  CheckCircle,
  RefreshCw,
  Calendar,
  Star as StarIcon,
  Mail,
  Smartphone,
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
  FontFamily,
} from '@/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { REQUEST_TEMPLATES, previewTemplate, type RequestTemplate } from '@/lib/request-templates';

// ─── Types ────────────────────────────────────────────────────────────────────

type Template = {
  id: string;
  name: string;
  body: string;
  industry: string | null;
  is_system: boolean;
  is_default: boolean;
  use_count: number;
};

// ─── Industry Icon Map ────────────────────────────────────────────────────────

const INDUSTRY_ICONS: Record<string, typeof Briefcase> = {
  general: FileText,
  trades: Zap,
  beauty: Scissors,
  health: Heart,
  auto: Car,
  food: UtensilsCrossed,
};

const INDUSTRY_COLORS: Record<string, string> = {
  general: Colors.slate[500],
  trades: Colors.warning[500],
  beauty: '#C84B9E',
  health: Colors.error[500],
  auto: Colors.primary[500],
  food: Colors.success[500],
};

// ─── Industry Badge ───────────────────────────────────────────────────────────

function IndustryBadge({ industry, isDark }: { industry: string | null; isDark: boolean }) {
  if (!industry) return null;
  const Icon = INDUSTRY_ICONS[industry] ?? FileText;
  const color = INDUSTRY_COLORS[industry] ?? Colors.slate[500];
  const label = industry.charAt(0).toUpperCase() + industry.slice(1);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: isDark ? `${color}22` : `${color}15`,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full,
    }}>
      <Icon size={10} color={color} strokeWidth={2} />
      <Text style={{ fontFamily: 'Barlow-Condensed-SemiBold', fontSize: 10, color, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isDark,
  onPress,
  onDelete,
}: {
  template: Template;
  isDark: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
          : isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.xs,
        marginHorizontal: Layout.screenPaddingH,
        ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : Shadows.sm),
        opacity: template.is_system ? 0.85 : 1,
      })}
    >
      {/* Top row: name + badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 6 }}>
        {template.is_system && <Lock size={12} color={theme.textTertiary} strokeWidth={2} />}
        <Text style={[Typography.h4, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
          {template.name}
        </Text>
        <IndustryBadge industry={template.industry} isDark={isDark} />
        {template.use_count > 0 && (
          <View style={{
            backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
            paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full,
          }}>
            <Text style={{ fontFamily: 'Barlow-Condensed-SemiBold', fontSize: 10, color: Colors.primary[500] }}>
              {template.use_count}x
            </Text>
          </View>
        )}
      </View>

      {/* Body preview */}
      <Text style={[Typography.bodySm, { color: theme.textTertiary, lineHeight: 18 }]} numberOfLines={2}>
        {template.body}
      </Text>

      {/* Actions for user templates */}
      {!template.is_system && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.sm }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }}
            hitSlop={8}
          >
            <Edit3 size={16} color={Colors.primary[500]} strokeWidth={2} />
          </Pressable>
          {onDelete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDelete();
              }}
              hitSlop={8}
            >
              <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── Request Template Icon Map ───────────────────────────────────────────────

const REQUEST_ICON_MAP: Record<string, typeof Heart> = {
  'heart': Heart,
  'check-circle': CheckCircle,
  'star': StarIcon,
  'refresh-cw': RefreshCw,
  'calendar': Calendar,
};

// ─── Request Template Card ───────────────────────────────────────────────────

function RequestTemplateCard({
  template,
  isDark,
  expanded,
  onToggle,
}: {
  template: RequestTemplate;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = isDark ? DarkTheme : LightTheme;
  const Icon = REQUEST_ICON_MAP[template.icon] ?? FileText;
  const preview = previewTemplate(template);

  const handleSendSMS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Open native SMS with the template body
    const smsBody = encodeURIComponent(preview.body.replace(/\n/g, ' '));
    const url = `sms:?body=${smsBody}`;
    import('react-native').then(({ Linking }) => Linking.openURL(url).catch(() => {}));
  };

  const handleSendEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const subject = encodeURIComponent(preview.subject);
    const body = encodeURIComponent(preview.body);
    const url = `mailto:?subject=${subject}&body=${body}`;
    import('react-native').then(({ Linking }) => Linking.openURL(url).catch(() => {}));
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3
          : isDark ? DarkTheme.bgSurface : '#FFFFFF',
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.xs,
        marginHorizontal: Layout.screenPaddingH,
        ...(isDark ? { borderWidth: 1, borderColor: DarkTheme.borderDefault } : Shadows.sm),
      })}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={Colors.primary[500]} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.h4, { color: theme.textPrimary }]} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={[Typography.caption, { color: theme.textTertiary }]}>
            {template.description}
          </Text>
        </View>
        <View style={{
          backgroundColor: isDark ? `${Colors.primary[500]}22` : Colors.primary[50],
          paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full,
        }}>
          <Text style={{ fontFamily: 'Barlow-Condensed-SemiBold', fontSize: 10, color: Colors.primary[500], textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {template.category}
          </Text>
        </View>
      </View>

      {/* Expanded Preview */}
      {expanded && (
        <View style={{ marginTop: Spacing.md }}>
          {/* Subject line */}
          <Text style={[Typography.caption, { color: theme.textTertiary, marginBottom: 2 }]}>SUBJECT</Text>
          <Text style={[Typography.bodySm, { color: theme.textPrimary, marginBottom: Spacing.sm, fontFamily: FontFamily.sourceSansSemiBold }]}>
            {preview.subject}
          </Text>

          {/* Message preview */}
          <Text style={[Typography.caption, { color: theme.textTertiary, marginBottom: 2 }]}>MESSAGE</Text>
          <View style={{
            backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
            borderRadius: Radius.sm,
            padding: Spacing.md,
            marginBottom: Spacing.md,
          }}>
            <Text style={[Typography.bodySm, { color: theme.textSecondary, lineHeight: 20 }]}>
              {preview.body}
            </Text>
          </View>

          {/* Merge fields legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md }}>
            {['{customer_name}', '{business_name}', '{review_link}'].map((tag) => (
              <View key={tag} style={{
                backgroundColor: isDark ? Colors.accent[700] + '20' : Colors.accent[50],
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
              }}>
                <Text style={{ fontFamily: FontFamily.barlowCondensedSemiBold, fontSize: 10, color: Colors.accent[700], letterSpacing: 0.3 }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Send buttons */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Pressable
              onPress={handleSendSMS}
              style={({ pressed }) => ({
                flex: 1, height: 40, borderRadius: Radius.sm,
                backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
              })}
            >
              <Smartphone size={14} color="#FFFFFF" strokeWidth={2} />
              <Text style={[Typography.buttonSm, { color: '#FFFFFF', fontSize: 13 }]}>SEND SMS</Text>
            </Pressable>
            <Pressable
              onPress={handleSendEmail}
              style={({ pressed }) => ({
                flex: 1, height: 40, borderRadius: Radius.sm,
                backgroundColor: pressed
                  ? isDark ? DarkTheme.bgSurface3 : Colors.slate[200]
                  : isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
                borderWidth: 1, borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
              })}
            >
              <Mail size={14} color={Colors.primary[500]} strokeWidth={2} />
              <Text style={[Typography.buttonSm, { color: Colors.primary[500], fontSize: 13 }]}>SEND EMAIL</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TemplateListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);

  const [systemTemplates, setSystemTemplates] = useState<Template[]>([]);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [, setLoading] = useState(true);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, body, industry, is_system, is_default, use_count')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('is_system', { ascending: false })
        .order('use_count', { ascending: false });

      if (!error) {
        const all = (data ?? []) as Template[];
        setSystemTemplates(all.filter((t) => t.is_system));
        setUserTemplates(all.filter((t) => !t.is_system));
      }
    } catch {
      // Non-critical — empty list shown
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Remove "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await supabase.from('templates').delete().eq('id', template.id);
            if (!error) setUserTemplates((prev) => prev.filter((t) => t.id !== template.id));
          },
        },
      ]
    );
  };

  const sections = [
    { title: 'SYSTEM', data: systemTemplates },
    { title: 'MY TEMPLATES', data: userTemplates },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: theme.borderDefault,
      }}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={12}>
          <X size={22} color={theme.textPrimary} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: Spacing.sm }}>
          <MessageSquare size={18} color={Colors.primary[500]} strokeWidth={2} />
          <Text style={[Typography.h2, { color: theme.textPrimary }]}>TEMPLATES</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/templates/new');
          }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
            backgroundColor: pressed ? Colors.accent[400] : Colors.accent[300],
          })}
        >
          <Plus size={14} color={Colors.primary[900]} strokeWidth={2.5} />
          <Text style={{ fontFamily: 'Barlow-Condensed-Bold', fontSize: 12, color: Colors.primary[900], letterSpacing: 0.5 }}>NEW</Text>
        </Pressable>
      </View>

      {/* Content */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ marginBottom: Spacing.md }}>
            {/* Request Templates Section */}
            <View style={{
              paddingHorizontal: Layout.screenPaddingH, paddingVertical: Spacing.xs, marginBottom: Spacing.xs,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text style={[Typography.label, { color: theme.textTertiary }]}>
                REVIEW REQUEST TEMPLATES
              </Text>
              <Text style={[Typography.caption, { color: theme.textTertiary }]}>
                {REQUEST_TEMPLATES.length}
              </Text>
            </View>
            {REQUEST_TEMPLATES.map((t) => (
              <RequestTemplateCard
                key={t.id}
                template={t}
                isDark={isDark}
                expanded={expandedRequestId === t.id}
                onToggle={() => setExpandedRequestId(expandedRequestId === t.id ? null : t.id)}
              />
            ))}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{
            paddingHorizontal: Layout.screenPaddingH, paddingVertical: Spacing.xs, marginBottom: Spacing.xs,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={[Typography.label, { color: theme.textTertiary }]}>
              {section.title}
            </Text>
            <Text style={[Typography.caption, { color: theme.textTertiary }]}>
              {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            isDark={isDark}
            onPress={() => {
              if (item.is_system) {
                // View-only for system templates; navigate with readonly flag
                router.push(`/templates/${item.id}?readonly=true`);
              } else {
                router.push(`/templates/${item.id}`);
              }
            }}
            onDelete={!item.is_system ? () => handleDelete(item) : undefined}
          />
        )}
        renderSectionFooter={({ section }) => {
          if (section.title === 'MY TEMPLATES' && section.data.length === 0) {
            return (
              <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: isDark ? Colors.primary[900] : Colors.primary[50],
                  alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
                }}>
                  <FileText size={22} color={Colors.primary[500]} strokeWidth={1.5} />
                </View>
                <Text style={[Typography.bodySm, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.md }]}>
                  Create custom templates for your business
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/templates/new');
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
                    height: 40, paddingHorizontal: Spacing.lg, borderRadius: Radius.sm,
                    backgroundColor: pressed ? Colors.primary[700] : Colors.primary[500],
                  })}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={[Typography.buttonSm, { color: '#FFFFFF' }]}>CREATE TEMPLATE</Text>
                </Pressable>
              </View>
            );
          }
          return null;
        }}
      />
    </SafeAreaView>
  );
}
