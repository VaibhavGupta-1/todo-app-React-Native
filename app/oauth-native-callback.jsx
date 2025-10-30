import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * OAuth callback handler for Clerk authentication
 * This screen handles the redirect after Google OAuth login
 */
export default function OAuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Clerk automatically handles the OAuth callback
    // Just redirect to the main app
    router.replace('/(tabs)');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
