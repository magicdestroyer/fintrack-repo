/**
 * capacitor.config.ts — Capacitor config for iOS & Android native wrappers
 *
 * Prerequisites:
 *   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   npx cap init
 *
 * Build iOS:
 *   npx cap add ios && npx cap open ios
 *   → In Xcode: Product → Archive → Distribute App → App Store Connect
 *
 * Build Android:
 *   npx cap add android && npx cap open android
 *   → In Android Studio: Build → Generate Signed Bundle → Google Play
 *
 * IMPORTANT: Set appId and appName to your own values.
 *            Set server.url to your deployed Render/Railway URL.
 */

const config = {
  appId:   'com.yourname.fintrack',     // ← CHANGE THIS (reverse domain notation)
  appName: 'FinTrack',
  webDir:  'server/public',            // points to the built frontend

  // When running in the native app shell, load the remote production URL.
  // This means all API calls go to your real server — no local server needed.
  server: {
    url:             'https://your-fintrack-app.onrender.com',  // ← CHANGE THIS
    cleartext:        false,  // HTTPS only in production
    androidScheme:   'https',
    iosScheme:       'capacitor',
    allowNavigation: ['*.finance.yahoo.com', 'api.anthropic.com'],
  },

  // iOS-specific
  ios: {
    contentInset:       'automatic',
    backgroundColor:    '#0d0f12',
    preferredContentMode: 'mobile',
    // Required for push notifications (optional feature)
    // entitlements: { 'aps-environment': 'production' },
  },

  // Android-specific
  android: {
    backgroundColor: '#0d0f12',
    allowMixedContent: false,
  },

  plugins: {
    // SplashScreen: show the splash for 2s while the webview boots
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor:    '#0d0f12',
      androidSplashResourceName: 'splash',
      androidScaleType:   'CENTER_CROP',
      showSpinner:        false,
    },
    // StatusBar: match the dark app theme
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#0d0f12',
    },
    // PushNotifications: enable for price alerts (future feature)
    // PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
