Your package.json already contains `@codetrix-studio/capacitor-google-auth` at `^3.4.0-rc.4` (line 29). The only missing dependency is `@capacitor/browser` at `^8.0.3`.

### Plan

1. **Add the missing package**
   ```bash
   bun add @capacitor/browser@^8.0.3
   ```

2. **Verify retention of existing native dependencies**
   Confirm the following remain in `dependencies` after install:
   - `"@capacitor-community/apple-sign-in": "^7.1.0"`
   - `"capacitor-native-biometric": "^4.2.2"`
   - `"@capacitor/device": "^8.0.2"`

3. **Sync native projects**
   ```bash
   npx cap sync
   ```
   This updates `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist` with the configuration hooks for the newly added browser plugin.

No code changes beyond `package.json` and lockfile updates are required.