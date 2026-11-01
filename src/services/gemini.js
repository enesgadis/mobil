const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";

export async function fetchVisionUXPayload(level, xp) {
  const prompt = `Yazılım mühendisliği öğrencisi için Seviye ${level} (${xp} XP) Computer Vision görev JSON'u üret.
Strict JSON format:
{
  "theme": "standard_light" | "broken_contrast" | "wcag_dark_mode" | "mediapipe_terminal",
  "level": number,
  "quest": {
    "title": "string",
    "description": "string",
    "xp_reward": number,
    "code_snippet": "string"
  }
}`;

  try {
    if (API_KEY && API_KEY !== "YOUR_GEMINI_API_KEY") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) return JSON.parse(jsonText);
      }
    }
  } catch (error) {
    // Çevrimdışı / Hızlı fallback
  }

  return getLevelFallbackPayload(level, xp);
}

export function getLevelFallbackPayload(level, xp) {
  if (level === 1) {
    return {
      theme: "standard_light",
      level: 1,
      quest: {
        title: "Piksel Matris Manipülasyonu & RGB Tarama",
        description: "Kameradaki görüntüyü 2D matris olarak analiz edin. Ekranda beliren hedef piksellere dokunarak matris değerlerini eşitleyin.",
        xp_reward: 80,
        code_snippet: "function scanRGB(matrix, target) {\n  const [r, g, b] = matrix[target.y][target.x];\n  return (r * 0.299 + g * 0.587 + b * 0.114);\n}"
      }
    };
  }

  if (level === 2) {
    return {
      theme: "wcag_dark_mode",
      level: 2,
      quest: {
        title: "Konvolüsyon & Kenar Tespiti (Sobel Kernel)",
        description: "Görüntüdeki yüksek frekanslı kenarları çıkarmak için Sobel ve Gaussian kernel filtrelerini canlı kameraya uygulayın.",
        xp_reward: 120,
        code_snippet: "const SobelKernelX = [\n  [-1, 0, 1],\n  [-2, 0, 2],\n  [-1, 0, 1]\n];\nconst edgeIntensity = convolve2D(frame, SobelKernelX);"
      }
    };
  }

  // Seviye 3: El Takibi
  return {
    theme: "mediapipe_terminal",
    level: 3,
    quest: {
      title: "VisionUX: TensorFlow El Takibi & Jest Algılama",
      description: "Butonlar devredışı! Kameraya elinizi gösterin, 2 saniye boyunca kadrajda sabit tutarak temassız jest aksiyonunu tamamlayın.",
      xp_reward: 200,
      code_snippet: "const model = await handpose.load();\nconst hands = await model.estimateHands(cameraFrame);\nif (hands.length > 0) {\n  triggerPhysicalGestureAction();\n}"
    }
  };
}
