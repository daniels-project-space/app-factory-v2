// ReviewPulse — Template Editor Screen
// Sprint 11: Create/edit templates with merge tag insertion + live SMS preview
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ChevronLeft,
  Save,
  Trash2,
  User,
  Building2,
  Link2,
  Check,
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
} from '@/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type MergeTag = {
  tag: string;
  label: string;
  icon: typeof User;
  preview: string;
};

const MERGE_TAGS: MergeTag[] = [
  { tag: '{{name}}', label: 'Name', icon: User, preview: 'John' },
  { tag: '{{business}}', label: 'Business', icon: Building2, preview: 'Acme Plumbing' },
  { tag: '{{link}}', label: 'Review Link', icon: Link2, preview: 'g.page/r/...' },
];

// ─── Merge Tag Chip ───────────────────────────────────────────────────────────

function TagChip({
  tag,
  isDark,
  onPress,
}: {
  tag: MergeTag;
  isDark: boolean;
  onPress: () => void;
}) {
  const Icon = tag.icon;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: Radius.full,
        backgroundColor: pressed
          ? Colors.accent[400]
          : isDark ? Colors.primary[900] : Colors.primary[50],
        borderWidth: 1.5,
        borderColor: pressed ? Colors.accent[300] : isDark ? Colors.primary[700] : Colors.primary[300],
      })}
    >
      <Icon size={13} color={Colors.primary[500]} strokeWidth={2} />
      <Text style={{
        fontFamily: 'Barlow-Condensed-Bold',
        fontSize: 12,
        color: Colors.primary[500],
        letterSpacing: 0.3,
      }}>
        {tag.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

// ─── SMS Bubble Preview ───────────────────────────────────────────────────────

function SMSPreview({ text, isDark }: { text: string; isDark: boolean }) {
  const theme = isDark ? DarkTheme : LightTheme;
  const charCount = text.length;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
        <Text style={[Typography.label, { color: theme.textSecondary }]}>PREVIEW</Text>
        <Text style={[Typography.caption, {
          color: charCount > 160 ? Colors.warning[500] : theme.textTertiary,
          fontFamily: 'Barlow-Condensed-SemiBold',
        }]}>
          {charCount}/160{charCount > 160 ? ' (2 segments)' : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{
          backgroundColor: '#34C759',
          borderRadius: 18,
          borderBottomRightRadius: 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          maxWidth: '88%',
        }}>
          <Text style={{ fontFamily: 'Source-Sans-Regular', fontSize: 15, lineHeight: 21, color: '#FFFFFF' }}>
            {text || 'Your message preview will appear here...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TemplateEditorScreen() {
  const { id, readonly } = useLocalSearchParams<{ id: string; readonly?: string }>();
  const isNew = id === 'new';
  const isReadonly = readonly === 'true';
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const bodyRef = useRef<TextInput>(null);

  // Load existing template
  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('templates').select('name, body').eq('id', id).single();
        if (!error && data) {
          setName(data.name);
          setBody(data.body);
        }
      } catch {
        // Non-critical — empty template shown
      }
    })();
  }, [id, isNew]);

  // Track cursor position
  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setCursorPos(e.nativeEvent.selection.start);
  };

  // Insert merge tag at cursor
  const insertTag = (tag: string) => {
    const before = body.slice(0, cursorPos);
    const after = body.slice(cursorPos);
    const newBody = before + tag + after;
    setBody(newBody);
    const newPos = cursorPos + tag.length;
    setCursorPos(newPos);
    // Refocus the body input
    setTimeout(() => {
      bodyRef.current?.focus();
    }, 50);
  };

  // Preview with merged values
  const previewText = useMemo(() => {
    return body
      .replace(/\{\{name\}\}/g, 'John')
      .replace(/\{\{business\}\}/g, 'Acme Plumbing')
      .replace(/\{\{link\}\}/g, 'g.page/r/...');
  }, [body]);

  // Can save?
  const canSave = name.trim().length > 0 && body.trim().length > 0;

  // Save handler
  const handleSave = async () => {
    if (!canSave || !user || isReadonly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      if (isNew) {
        const { error } = await supabase.from('templates').insert({
          user_id: user.id,
          name: name.trim(),
          body: body.trim(),
          is_system: false,
          is_default: false,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('templates').update({
          name: name.trim(),
          body: body.trim(),
        }).eq('id', id);
        if (error) throw error;
      }

      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 600);
    } catch {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = () => {
    if (isNew || isReadonly) return;
    Alert.alert(
      'Delete Template',
      'Remove this template? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await supabase.from('templates').delete().eq('id', id);
            if (!error) router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.md, paddingBottom: Spacing.md,
          borderBottomWidth: 1, borderBottomColor: theme.borderDefault,
        }}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={12}>
            <ChevronLeft size={24} color={theme.textPrimary} strokeWidth={2} />
          </Pressable>
          <Text style={[Typography.h2, { color: theme.textPrimary, flex: 1, marginLeft: Spacing.sm }]}>
            {isReadonly ? 'VIEW TEMPLATE' : isNew ? 'NEW TEMPLATE' : 'EDIT TEMPLATE'}
          </Text>
          {!isReadonly && (
            <Pressable
              onPress={handleSave}
              disabled={!canSave || saving}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
                backgroundColor: saved
                  ? Colors.success[500]
                  : canSave
                    ? pressed ? Colors.accent[400] : Colors.accent[300]
                    : isDark ? DarkTheme.bgSurface3 : LightTheme.bgSurface3,
                opacity: !canSave && !saved ? 0.5 : 1,
              })}
            >
              {saved ? (
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <Save size={14} color={canSave ? Colors.primary[900] : theme.textTertiary} strokeWidth={2} />
              )}
              <Text style={{
                fontFamily: 'Barlow-Condensed-Bold', fontSize: 12, letterSpacing: 0.5,
                color: saved ? '#FFFFFF' : canSave ? Colors.primary[900] : theme.textTertiary,
              }}>
                {saved ? 'SAVED' : saving ? 'SAVING...' : 'SAVE'}
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing.lg }}>
            {/* Template name */}
            <Text style={[Typography.label, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>TEMPLATE NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. After-Job Follow Up"
              placeholderTextColor={theme.textTertiary}
              editable={!isReadonly}
              style={[Typography.h3, {
                color: theme.textPrimary,
                backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                borderRadius: Radius.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
              }]}
            />

            {/* Template body */}
            <Text style={[Typography.label, { color: theme.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.xs }]}>
              MESSAGE BODY
            </Text>
            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={setBody}
              onSelectionChange={handleSelectionChange}
              placeholder="Hi {{name}}, thanks for choosing {{business}}! Leave us a review: {{link}}"
              placeholderTextColor={theme.textTertiary}
              multiline
              editable={!isReadonly}
              textAlignVertical="top"
              style={[Typography.body, {
                color: theme.textPrimary,
                backgroundColor: isDark ? DarkTheme.bgSurface : '#FFFFFF',
                borderRadius: Radius.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: 12,
                minHeight: 140,
                borderWidth: 1,
                borderColor: isDark ? DarkTheme.borderDefault : LightTheme.borderDefault,
              }]}
            />

            {/* ─── Merge Tag Bar ─────────────────────────────────────────────── */}
            {!isReadonly && (
              <View style={{ marginTop: Spacing.sm }}>
                <Text style={[Typography.caption, { color: theme.textTertiary, marginBottom: 6 }]}>
                  TAP TO INSERT
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.xs }}
                >
                  {MERGE_TAGS.map((tag) => (
                    <TagChip
                      key={tag.tag}
                      tag={tag}
                      isDark={isDark}
                      onPress={() => insertTag(tag.tag)}
                    />
                  ))}
                </ScrollView>

                {/* Merge tag legend */}
                <View style={{
                  marginTop: Spacing.sm,
                  backgroundColor: isDark ? DarkTheme.bgSurface2 : LightTheme.bgSurface2,
                  borderRadius: Radius.sm,
                  padding: Spacing.sm,
                }}>
                  {MERGE_TAGS.map((tag) => (
                    <View key={tag.tag} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                      <Text style={{ fontFamily: 'Source-Sans-SemiBold', fontSize: 12, color: Colors.primary[500], width: 90 }}>
                        {tag.tag}
                      </Text>
                      <Text style={[Typography.caption, { color: theme.textTertiary }]}>
                        Replaced with customer's {tag.label.toLowerCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── Live SMS Preview ──────────────────────────────────────────── */}
            <View style={{ marginTop: Spacing.xl }}>
              <SMSPreview text={previewText} isDark={isDark} />
            </View>

            {/* ─── Delete Button ─────────────────────────────────────────────── */}
            {!isNew && !isReadonly && (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.xs,
                  marginTop: Spacing.xl,
                  paddingVertical: 14,
                  borderRadius: Radius.sm,
                  backgroundColor: pressed ? Colors.error[100] : 'transparent',
                  borderWidth: 1,
                  borderColor: Colors.error[300],
                })}
              >
                <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
                <Text style={[Typography.buttonSm, { color: Colors.error[500] }]}>DELETE TEMPLATE</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
