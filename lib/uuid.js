import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 compatible with React Native
 * Uses expo-crypto for secure random number generation
 */
export function generateUUID() {
  return Crypto.randomUUID();
}
