// ReviewPulse — Error Boundary
// Catches render errors and shows a recovery UI instead of crashing
// Wraps every screen to prevent full-app crashes

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, Layout, HapticMap } from '@/constants';
import { captureError } from '@/lib/sentry';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? '' });
  }

  handleRetry = () => {
    HapticMap.buttonPress();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: Layout.screenPaddingH,
            backgroundColor: Colors.slate[50],
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: Colors.warning[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.lg,
            }}
          >
            <AlertTriangle size={28} color={Colors.warning[700]} strokeWidth={2} />
          </View>

          <Text
            style={[
              Typography.h2,
              {
                color: Colors.slate[900],
                textAlign: 'center',
                marginBottom: Spacing.sm,
              },
            ]}
          >
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </Text>

          <Text
            style={[
              Typography.body,
              {
                color: Colors.slate[500],
                textAlign: 'center',
                marginBottom: Spacing.xl,
                maxWidth: 280,
              },
            ]}
          >
            An unexpected error occurred. Tap below to try again.
          </Text>

          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              backgroundColor: Colors.primary[500],
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md - 2,
              borderRadius: Radius.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={[Typography.button, { color: '#FFFFFF' }]}>
              TRY AGAIN
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
