# Urdu Aura Mobile

This workspace now contains a React Native + Expo version of Urdu Aura for iOS and Android.

Urdu Aura is built for non-native speakers who want a welcoming way to learn Urdu, and for current Urdu speakers who want to expand vocabulary, improve fluency, and grow their communication skills.

## Included features

- Lesson-based multiple choice practice
- Local XP, hearts, and streak tracking
- Review mode built from missed answers
- On-device persistence with AsyncStorage

## Run locally

1. Install dependencies with `npm install`
2. Start Expo with `npm run start`
3. Press `i` for the iOS simulator, `a` for Android, or scan the QR code with Expo Go

## Notes

- The original Python prototype was used as the source for the lesson logic and review system.
- Progress is stored locally on the device under the AsyncStorage key `urdu-lingo-progress`.
