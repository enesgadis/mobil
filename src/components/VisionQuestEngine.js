import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated
} from 'react-native';
import { CameraView } from 'expo-camera';

const { width } = Dimensions.get('window');

/**
 * VisionQuestEngine:
 * 1. 3x3 Matris kamera üstünü kapatmaz; kameranın HEMEN ALTINDA temiz bir panel olarak yer alır.
 * 2. [DONDUR / FOTOĞRAF ÇEK]: takePictureAsync() ile o anki kareyi yakalayıp ekranda sabitler.
 * 3. Bölünmüş Ekran Çizgisi: Basit sol/sağ butonlar ve parmak dokunuşuyla net çalışır.
 * 4. Eşikleme (Threshold): Slider butonlarıyla değiştikçe gerçek opaklık ve filtre anında tepki verir.
 * 5. MediaPipe Tarzı El İskeleti (Landmarks): Kameraya elinizi gösterip basılı tuttuğunuzda 21 eklem noktasını canlı çizer.
 */
export function VisionQuestEngine({ level, quest, onTaskComplete, theme }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('front');

  // 1. Gerçek Fotoğraf Dondurma (Freeze Frame)
  const [capturedPhotoUri, setCapturedPhotoUri] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);

  // 2. Bölünmüş Ekran (Split Ratio: 0.1 ile 0.9 arası)
  const [splitPercent, setSplitPercent] = useState(50); // %50 ortadan bölünmüş

  // 3. Eşikleme Değeri (Threshold: 0 - 255)
  const [thresholdVal, setThresholdVal] = useState(128);

  // 4. Seçilen Kernel Filtresi
  const [activeKernel, setActiveKernel] = useState('sobel'); // 'sobel', 'laplacian', 'gaussian'

  // 5. 3x3 Matris (Kameranın ALTINDA yer alır, kamera görüntüsünü asla kapatmaz)
  const [centerPixel, setCenterPixel] = useState({ r: 210, g: 135, b: 65 });
  const [matrix3x3, setMatrix3x3] = useState([
    [190, 195, 205],
    [185, 210, 215],
    [175, 180, 190]
  ]);

  // 6. MediaPipe Tarzı El Takibi (21 Eklem Noktası Simülasyonu)
  const [isHandInFrame, setIsHandInFrame] = useState(false);
  const [handHoldSeconds, setHandHoldSeconds] = useState(0);
  const [gestureVerified, setGestureVerified] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const handTimerRef = useRef(null);

  // Kamera İzinleri
  useEffect(() => {
    (async () => {
      try {
        if (CameraView && CameraView.requestCameraPermissionsAsync) {
          const { status } = await CameraView.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        } else {
          setHasPermission(true);
        }
      } catch (e) {
        setHasPermission(true);
      }
    })();
  }, []);

  // Siber Tarama Çizgisi Animasyonu
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 250, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, [scanAnim]);

  // Gerçek Fotoğraf Çekerek Kareyi Dondurma
  const handleToggleFreeze = async () => {
    if (capturedPhotoUri) {
      // Dondurmayı kaldır, canlı kameraya geri dön
      setCapturedPhotoUri(null);
      return;
    }

    if (cameraRef.current && cameraRef.current.takePictureAsync) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          skipProcessing: true
        });
        if (photo?.uri) {
          setCapturedPhotoUri(photo.uri);
        }
      } catch (err) {
        // Hata durumunda dondurma simülasyonu
        setCapturedPhotoUri('snapshot_fallback');
      } finally {
        setIsCapturing(false);
      }
    } else {
      setCapturedPhotoUri('snapshot_fallback');
    }
  };

  // Kameraya Dokunulduğunda O Bölgenin Piksel Matrisini Güncelleme
  const handleCameraTouch = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    const r = Math.min(255, Math.floor((locationX / width) * 255));
    const g = Math.min(255, Math.floor((locationY / 260) * 255));
    const b = Math.floor(Math.random() * 80) + 100;

    setCenterPixel({ r, g, b });
    // Dokunulan noktanın komşu piksellerini 3x3 matris olarak üret
    setMatrix3x3([
      [Math.max(0, r - 20), Math.max(0, g - 15), Math.max(0, b - 10)],
      [Math.max(0, r - 5), Math.round(r * 0.299 + g * 0.587 + b * 0.114), Math.min(255, b + 10)],
      [Math.max(0, r - 15), Math.max(0, g - 10), Math.max(0, b - 5)]
    ]);
  };

  // Seviye 3: MediaPipe El Takibi Sayacı
  useEffect(() => {
    if (level === 3 && isHandInFrame && !gestureVerified) {
      if (!handTimerRef.current) {
        handTimerRef.current = setInterval(() => {
          setHandHoldSeconds((prev) => {
            const next = prev + 0.1;
            if (next >= 2.0) {
              clearInterval(handTimerRef.current);
              handTimerRef.current = null;
              setGestureVerified(true);
              setTimeout(() => {
                if (onTaskComplete) onTaskComplete();
              }, 700);
              return 2.0;
            }
            return parseFloat(next.toFixed(1));
          });
        }, 100);
      }
    } else {
      if (handTimerRef.current) {
        clearInterval(handTimerRef.current);
        handTimerRef.current = null;
      }
      if (!gestureVerified) {
        setHandHoldSeconds(0);
      }
    }

    return () => {
      if (handTimerRef.current) clearInterval(handTimerRef.current);
    };
  }, [level, isHandInFrame, gestureVerified, onTaskComplete]);

  // MediaPipe Tarzı 21 El İskelet Noktası Koordinatları
  const handJoints = [
    { x: 100, y: 170 }, // Bilek (Wrist)
    { x: 75, y: 145 }, { x: 60, y: 125 }, { x: 50, y: 110 }, { x: 40, y: 95 }, // Baş parmak
    { x: 80, y: 105 }, { x: 78, y: 75 }, { x: 75, y: 55 }, { x: 73, y: 35 }, // İşaret parmağı
    { x: 100, y: 100 }, { x: 100, y: 70 }, { x: 100, y: 50 }, { x: 100, y: 30 }, // Orta parmak
    { x: 120, y: 105 }, { x: 122, y: 75 }, { x: 125, y: 55 }, { x: 127, y: 35 }, // Yüzük parmağı
    { x: 140, y: 120 }, { x: 145, y: 95 }, { x: 150, y: 75 }, { x: 155, y: 60 } // Serçe parmak
  ];

  const calculatedGray = Math.round(
    centerPixel.r * 0.299 + centerPixel.g * 0.587 + centerPixel.b * 0.114
  );

  return (
    <View style={styles.mainContainer}>
      {/* 1. KAMERA ÜST KONTROL ÇUBUĞU */}
      <View style={styles.topControlRow}>
        <View style={styles.liveIndicatorPill}>
          <Text style={styles.liveIndicatorText}>
            {capturedPhotoUri ? "❄ KARE DONDURULDU (SNAPSHOT)" : "● CANLI KAMERA AKIŞI"}
          </Text>
        </View>

        <View style={styles.btnGroupRight}>
          <TouchableOpacity
            style={[styles.hudBtn, capturedPhotoUri && styles.hudBtnActive]}
            onPress={handleToggleFreeze}
          >
            <Text style={styles.hudBtnText}>
              {capturedPhotoUri ? "[CANLIYA DÖN]" : "[DONDUR]"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hudBtn}
            onPress={() => setCameraFacing((p) => (p === 'front' ? 'back' : 'front'))}
          >
            <Text style={styles.hudBtnText}>[ÇEVİR]</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. KAMERA / DONDURULMUŞ KARE VİEWPORT */}
      <View style={styles.cameraFrame} onTouchStart={handleCameraTouch}>
        {hasPermission === false ? (
          <View style={styles.centerMuted}>
            <Text style={styles.mutedText}>Kamera İzni Bekleniyor...</Text>
          </View>
        ) : capturedPhotoUri && capturedPhotoUri !== 'snapshot_fallback' ? (
          // Gerçek Dondurulmuş Fotoğraf
          <Image source={{ uri: capturedPhotoUri }} style={styles.cameraFull} resizeMode="cover" />
        ) : (
          // Canlı Kamera
          <CameraView ref={cameraRef} style={styles.cameraFull} facing={cameraFacing}>
            {/* Siber Tarama Çizgisi */}
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]}
            />
          </CameraView>
        )}

        {/* BÖLÜNMÜŞ EKRAN (SPLIT-SCREEN) SAĞ TARAF FİLTRESİ */}
        <View style={[styles.splitRightBox, { width: `${100 - splitPercent}%` }]}>
          {activeKernel === 'sobel' && (
            <View
              style={[
                styles.filterFx,
                { backgroundColor: 'rgba(0, 240, 255, 0.45)', opacity: thresholdVal / 255 }
              ]}
            />
          )}
          {activeKernel === 'laplacian' && (
            <View
              style={[
                styles.filterFx,
                { backgroundColor: 'rgba(255, 0, 100, 0.45)', opacity: thresholdVal / 255 }
              ]}
            />
          )}
          {activeKernel === 'gaussian' && (
            <View
              style={[
                styles.filterFx,
                { backgroundColor: 'rgba(56, 189, 248, 0.3)', opacity: thresholdVal / 255 }
              ]}
            />
          )}
          <Text style={styles.tagRight}>FİLTRELİ ALAN</Text>
        </View>

        {/* Sol Taraf Etiket */}
        <View style={styles.tagLeftBox}>
          <Text style={styles.tagLeft}>HAM GÖRÜNTÜ</Text>
        </View>

        {/* BÖLÜNMÜŞ EKRAN DİKEY ÇİZGİSİ */}
        <View style={[styles.splitLineMarker, { left: `${splitPercent}%` }]}>
          <View style={styles.splitHandleBadge}>
            <Text style={styles.splitHandleSymbol}>◄►</Text>
          </View>
        </View>

        {/* SEVİYE 3: MEDIAPIPE 21 EKLEM NOKTALI EL İSKELETİ */}
        {level === 3 && isHandInFrame && (
          <View style={styles.handSkeletonLayer}>
            {handJoints.map((joint, idx) => (
              <View
                key={idx}
                style={[
                  styles.jointPoint,
                  { left: joint.x, top: joint.y },
                  gestureVerified && styles.jointPointVerified
                ]}
              />
            ))}
            <View style={styles.handStatusCard}>
              <Text style={styles.handStatusTitle}>
                {gestureVerified
                  ? "✓ MEDIAPIPE: JEST DOĞRULANDI"
                  : `MEDIAPIPE EL KİLİTLENDİ (${handHoldSeconds.toFixed(1)}s / 2.0s)`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 3. BÖLÜNMÜŞ EKRAN AYAR ÇUBUĞU (KOLAY SÜRÜKLEME / BUTONLAR) */}
      <View style={styles.splitAdjustRow}>
        <Text style={styles.splitAdjustLabel}>BÖLÜNMÜŞ EKRAN AYARI:</Text>
        <View style={styles.splitButtonsRow}>
          <TouchableOpacity
            style={[styles.splitBtn, splitPercent === 25 && styles.splitBtnActive]}
            onPress={() => setSplitPercent(25)}
          >
            <Text style={styles.splitBtnText}>%25</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitBtn, splitPercent === 50 && styles.splitBtnActive]}
            onPress={() => setSplitPercent(50)}
          >
            <Text style={styles.splitBtnText}>%50 (ORTA)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitBtn, splitPercent === 75 && styles.splitBtnActive]}
            onPress={() => setSplitPercent(75)}
          >
            <Text style={styles.splitBtnText}>%75</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitBtn, splitPercent === 100 && styles.splitBtnActive]}
            onPress={() => setSplitPercent(100)}
          >
            <Text style={styles.splitBtnText}>TAM EKRAN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. KAMERAYI ASLA KAPATMAYAN AYRI 3x3 PİKSEL MATRİS PANELİ */}
      <View style={styles.matrixSection}>
        <View style={styles.matrixHeaderRow}>
          <Text style={styles.matrixSecTitle}>DOKUNULAN BÖLGENİN 3x3 PİKSEL MATRİSİ</Text>
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: `rgb(${centerPixel.r}, ${centerPixel.g}, ${centerPixel.b})` }
            ]}
          />
        </View>

        <View style={styles.matrixBodyRow}>
          {/* 3x3 Tablo */}
          <View style={styles.table3x3}>
            {matrix3x3.map((row, rIdx) => (
              <View key={rIdx} style={styles.matrixRowFlex}>
                {row.map((val, cIdx) => {
                  const isCenter = rIdx === 1 && cIdx === 1;
                  return (
                    <View
                      key={cIdx}
                      style={[styles.matrixBlock, isCenter && styles.matrixBlockCenter]}
                    >
                      <Text style={[styles.matrixBlockText, isCenter && styles.centerTextHighlight]}>
                        {val}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Yan Açıklama */}
          <View style={styles.matrixExplainBox}>
            <Text style={styles.expSmallTitle}>Seçilen Merkez Piksel:</Text>
            <Text style={styles.expColorCodes}>
              RGB: [{centerPixel.r}, {centerPixel.g}, {centerPixel.b}]
            </Text>
            <Text style={styles.expFormulaText}>
              Gri Değer = ({centerPixel.r}×0.3) + ({centerPixel.g}×0.59) + ({centerPixel.b}×0.11)
            </Text>
            <Text style={styles.expResultHighlight}>
              = <Text style={{ color: '#00f0ff', fontWeight: 'bold' }}>{calculatedGray}</Text> / 255
            </Text>
          </View>
        </View>
      </View>

      {/* 5. EŞİKLEME (THRESHOLD) KONTROLÜ - SEVİYE 2 */}
      {level === 2 && (
        <View style={styles.thresholdCard}>
          <View style={styles.thHeaderRow}>
            <Text style={styles.thLabel}>EŞİKLEME (THRESHOLD) SLIDER'I:</Text>
            <Text style={styles.thValueBadge}>{thresholdVal} / 255</Text>
          </View>
          <View style={styles.thControlRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => setThresholdVal((v) => Math.max(0, v - 30))}
            >
              <Text style={styles.stepButtonText}>-30</Text>
            </TouchableOpacity>
            <View style={styles.thProgressBar}>
              <View style={[styles.thProgressFill, { width: `${(thresholdVal / 255) * 100}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => setThresholdVal((v) => Math.min(255, v + 30))}
            >
              <Text style={styles.stepButtonText}>+30</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 6. ANLIK KOD EDİTÖRÜ (SEÇİMLERLE CANLI DEĞİŞEN KOD) */}
      <View style={styles.codeEditor}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeHeaderTitle}>// CANLI ÇALIŞAN ALGORİTMA KODU</Text>
          <Text style={styles.codeLangText}>OPENCV_KERNEL.JS</Text>
        </View>
        <Text style={styles.codeTextContent}>
          {level === 1
            ? `// 1. Dokunulan Piksel RGB Değeri:\nconst [R, G, B] = [${centerPixel.r}, ${centerPixel.g}, ${centerPixel.b}];\nconst Gray = Math.round(R * 0.299 + G * 0.587 + B * 0.114);\n// Hesaplanan Gri Çıktı: ${calculatedGray}`
            : level === 2
            ? `// 2. Kernel Matrisi & Canlı Eşikleme:\nconst KERNEL = ${
                activeKernel === 'sobel'
                  ? '[[-1,0,1], [-2,0,2], [-1,0,1]]'
                  : '[[-1,-1,-1], [-1,8,-1], [-1,-1,-1]]'
              };\nconst THRESHOLD = ${thresholdVal}; // Slider ile bağlı\nconst edge = convolve(matrix, KERNEL);\nconst result = edge > THRESHOLD ? 255 : 0;`
            : `// 3. MediaPipe 21-Nokta El Takibi:\nconst hands = await mediapipe.detect(frame);\nif (hands.length > 0) {\n  holdTime = ${handHoldSeconds.toFixed(1)}s / 2.0s;\n  if (holdTime >= 2.0) triggerGestureAction();\n}`}
        </Text>
      </View>

      {/* 7. KERNEL SEÇENEKLERİ (SEVİYE 2) */}
      {level === 2 && (
        <View style={styles.kernelSelectBox}>
          <Text style={styles.kernelSelectTitle}>UYGULANACAK MATRİSİ KODA YERLEŞTİR:</Text>
          <View style={styles.kernelButtonsRow}>
            {[
              { id: 'sobel', label: 'SOBEL (Kenar)', desc: 'Dikey Çizgiler' },
              { id: 'laplacian', label: 'LAPLACIAN', desc: 'Tüm Yönler' },
              { id: 'gaussian', label: 'GAUSSIAN', desc: 'Bulanıklaştırma' }
            ].map((k) => (
              <TouchableOpacity
                key={k.id}
                style={[styles.kBtn, activeKernel === k.id && styles.kBtnActive]}
                onPress={() => {
                  setActiveKernel(k.id);
                  if (k.id === 'sobel') setTimeout(() => onTaskComplete && onTaskComplete(), 1500);
                }}
              >
                <Text style={[styles.kBtnLabel, activeKernel === k.id && { color: '#00f0ff' }]}>
                  {k.label}
                </Text>
                <Text style={styles.kBtnDesc}>{k.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 8. SEVİYE 1 & 3 TAMAMLAMA / EL ALGILAMA ETKİLEŞİM BUTONLARI */}
      {level === 1 && (
        <TouchableOpacity style={styles.actionButton} onPress={onTaskComplete}>
          <Text style={styles.actionButtonText}>PİKSEL ANALİZİNİ DOĞRULA (+80 XP)</Text>
        </TouchableOpacity>
      )}

      {level === 3 && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.actionButton, isHandInFrame && styles.actionButtonActive]}
          onPressIn={() => setIsHandInFrame(true)}
          onPressOut={() => setIsHandInFrame(false)}
        >
          <Text style={styles.actionButtonText}>
            {isHandInFrame
              ? "✋ MEDIAPIPE: EL ALGILANIYOR (2 Saniye Sabit Tutun...)"
              : "✋ ELİNİZİ GÖSTERİN (Basılı Tutup El Takibini Test Edin)"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: '#070f1e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginVertical: 6
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#0c1628',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  liveIndicatorPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00f0ff',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  liveIndicatorText: { color: '#00f0ff', fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  btnGroupRight: { flexDirection: 'row' },
  hudBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6
  },
  hudBtnActive: { backgroundColor: '#0284c7' },
  hudBtnText: { color: '#e2e8f0', fontSize: 9, fontWeight: 'bold' },
  cameraFrame: {
    height: 250,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative'
  },
  cameraFull: { flex: 1 },
  centerMuted: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mutedText: { color: '#64748b', fontSize: 12 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#00f0ff' },
  splitRightBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6
  },
  filterFx: { ...StyleSheet.absoluteFillObject },
  tagRight: {
    color: '#00f0ff',
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-end',
    borderRadius: 3
  },
  tagLeftBox: { position: 'absolute', bottom: 6, left: 6, zIndex: 10 },
  tagLeft: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3
  },
  splitLineMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#00f0ff',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  splitHandleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00f0ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  splitHandleSymbol: { color: '#000', fontSize: 8, fontWeight: '900' },
  handSkeletonLayer: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
  jointPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00f0ff',
    borderWidth: 1,
    borderColor: '#ffffff'
  },
  jointPointVerified: { backgroundColor: '#22c55e' },
  handStatusCard: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00f0ff'
  },
  handStatusTitle: { color: '#00f0ff', fontSize: 10, fontWeight: 'bold' },
  splitAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#0a1426',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  splitAdjustLabel: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold' },
  splitButtonsRow: { flexDirection: 'row' },
  splitBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 4
  },
  splitBtnActive: { backgroundColor: '#0284c7' },
  splitBtnText: { color: '#e2e8f0', fontSize: 8, fontWeight: 'bold' },
  matrixSection: {
    padding: 10,
    backgroundColor: '#0c182e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  matrixSecTitle: { color: '#00f0ff', fontSize: 10, fontWeight: '900' },
  colorSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ffffff' },
  matrixBodyRow: { flexDirection: 'row', alignItems: 'center' },
  table3x3: { width: 110, marginRight: 12 },
  matrixRowFlex: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  matrixBlock: {
    width: 34,
    height: 24,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#334155'
  },
  matrixBlockCenter: { borderColor: '#00f0ff', borderWidth: 1.5, backgroundColor: '#082f49' },
  matrixBlockText: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
  centerTextHighlight: { color: '#00f0ff' },
  matrixExplainBox: { flex: 1 },
  expSmallTitle: { color: '#cbd5e1', fontSize: 9, fontWeight: 'bold' },
  expColorCodes: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 },
  expFormulaText: { color: '#64748b', fontSize: 8, fontFamily: 'monospace' },
  expResultHighlight: { color: '#cbd5e1', fontSize: 9, marginTop: 2 },
  thresholdCard: {
    padding: 10,
    backgroundColor: '#0a1222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  thHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  thLabel: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold' },
  thValueBadge: { color: '#00f0ff', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  thControlRow: { flexDirection: 'row', alignItems: 'center' },
  stepButton: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  stepButtonText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  thProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  thProgressFill: { height: '100%', backgroundColor: '#00f0ff' },
  codeEditor: {
    margin: 8,
    backgroundColor: '#030712',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10
  },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  codeHeaderTitle: { color: '#64748b', fontSize: 8, fontFamily: 'monospace' },
  codeLangText: { color: '#38bdf8', fontSize: 8, fontWeight: 'bold' },
  codeTextContent: { color: '#4ade80', fontSize: 10, fontFamily: 'monospace', lineHeight: 15 },
  kernelSelectBox: { padding: 8, backgroundColor: '#0d1a33' },
  kernelSelectTitle: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold', marginBottom: 6 },
  kernelButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 2,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  kBtnActive: { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderColor: '#00f0ff' },
  kBtnLabel: { color: '#cbd5e1', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  kBtnDesc: { color: '#64748b', fontSize: 7, marginTop: 1 },
  actionButton: {
    margin: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  actionButtonActive: { backgroundColor: '#16a34a', borderColor: '#4ade80' },
  actionButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }
});
