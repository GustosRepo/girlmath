// Dynamic Expo config — extends app.json and injects env vars at build time.
// app.config.js takes precedence over app.json when both exist.

const iosAppId = process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const androidAppId = process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        userTrackingUsageDescription:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
    ...(config.plugins ?? []).filter(
      (p) => (Array.isArray(p) ? p[0] : p) !== 'react-native-google-mobile-ads',
    ),
  ],
});
