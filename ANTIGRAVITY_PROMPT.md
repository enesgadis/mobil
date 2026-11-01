# DevPrimer (VisionUX) - Antigravity Agent Master Prompt

Bu dizinde gerçek zamanlı kamera ve TensorFlow tabanlı el takibi (hand-tracking) barındıran tam fonksiyonel **DevPrimer (VisionUX)** projesi yapılandırılmıştır:

1. **Bağımlılıklar:** `expo`, `react-native`, `@google/genai`, `firebase`, `expo-camera`, `@tensorflow/tfjs-react-native`, `@tensorflow/tfjs`, `@tensorflow-models/handpose`, `expo-gl`.
2. **Temalar (`src/theme/themes.js`):**
   - `standard_light` (Seviye 1 - Algoritma)
   - `broken_contrast` (WCAG ihlali)
   - `wcag_dark_mode` (Seviye 2 - WCAG Onarımı)
   - `mediapipe_terminal` (Seviye 3 - Vision / Cyberpunk Terminal)
3. **Gemini BDUI (`src/services/gemini.js`):** `@google/genai` ile `gemini-2.5-flash` modeli üzerinden Server-Driven UI şeması üretimi.
4. **Firebase (`src/services/firebase.js`):** Firestore üzerinden `syncProgress(uid, xp, level)` ile anlık `updateDoc` senkronizasyonu.
5. **Görü İşleme Modülü (`src/components/VisionCameraModule.js`):** `expo-camera` ve `@tensorflow-models/handpose` ile ekranda el 2 saniye sabit tutulduğunda `onGestureTriggered` tetikleyicisi.
6. **BDUI Motoru (`src/components/ServerDrivenUI.js`):** `vision_camera_feed` bileşeniyle Seviye 3'te kamerayı render eden motor.
7. **Orkestratör (`App.js`):** XP baremlerine (0-100, 101-300, 301+) göre otomatik seviye, tema ve kamera aktivasyonu.
