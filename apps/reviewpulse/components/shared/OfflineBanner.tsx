// ReviewPulse — Offline Banner
// Shows a slim banner at the top of screens when the device is offline
// Uses NetInfo to monitor connectivity state
// Renders nothing when online — zero layout impact

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, FontFamily, Spacing } from '@/constants';

export function OfflineBanner() {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);

      if (offline) {
        setVisible(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: -40,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }
    });

    return () => unsubscribe();
  }, [slideAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={{
          backgroundColor: Colors.warning[500],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.xs + 2,
          paddingVertical: Spacing.xs + 2,
          paddingHorizontal: Spacing.md,
        }}
      >
        <WifiOff size={14} color="#FFFFFF" strokeWidth={2.5} />
        <Text
          style={{
            fontFamily: FontFamily.sourceSansSemiBold,
            fontSize: 13,
            color: '#FFFFFF',
            letterSpacing: 0.2,
          }}
        >
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}
