import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { ReactNode } from 'react';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
}

const SLIDE_DISTANCE = 480;

/**
 * Simple modal bottom sheet built on RN Modal + Animated — no native
 * dependencies, safe on react-native-web.
 */
export function Sheet({ visible, onClose, title, children, testID }: SheetProps) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const [mounted, setMounted] = useState(visible);
  // Native driver is unavailable on web; Animated falls back to JS timing.
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SLIDE_DISTANCE,
        duration: 180,
        useNativeDriver,
      }).start(() => setMounted(false));
    }
  }, [visible, translateY, useNativeDriver]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          accessibilityLabel="Close sheet"
          style={styles.backdrop}
          onPress={onClose}
        />
        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              paddingHorizontal: theme.spacing.xl,
              paddingBottom: theme.spacing.xxl,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
          {title ? (
            <Text variant="title" style={{ marginBottom: theme.spacing.lg }}>
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 16, 0.55)',
  },
  sheet: {
    paddingTop: 8,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
});
