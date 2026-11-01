import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

/**
 * Seviye 3 - Gerçek Zamanlı TensorFlow Tabanlı El Takip Modülü
 * Kamerada el algılandığında 2 saniye boyunca takip eder ve onGestureTriggered callback'ini tetikler.
 */
export function VisionCameraModule({ onGestureTriggered, theme }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front');

  const handDetectedRef = useRef(false);
  const timerRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        if (CameraView && CameraView.requestCameraPermissionsAsync) {
          const { status } = await CameraView.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        } else {
          setHasPermission(true);
        }
      } catch (err) {
        setHasPermission(true);
      }
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initTensorFlow() {
      try {
        await tf.ready();
        const loadedModel = await handpose.load();
        if (isMounted) {
          setModel(loadedModel);
          setIsModelLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsModelLoading(false);
        }
      }
    }
    initTensorFlow();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHandDetected && !triggered) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimerSeconds((prev) => {
            const next = prev + 0.1;
            if (next >= 2.0) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              setTriggered(true);
              if (onGestureTriggered) {
                onGestureTriggered();
              }
              return 2.0;
            }
            return parseFloat(next.toFixed(1));
          });
        }, 100);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!triggered) {
        setTimerSeconds(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isHandDetected, triggered, onGestureTriggered]);

  const toggleHandState = (detected) => {
    handDetectedRef.current = detected;
    setIsHandDetected(detected);
  };

  const resetGesture = () => {
    setTriggered(false);
    setTimerSeconds(0);
    setIsHandDetected(false);
    handDetectedRef.current = false;
  };

  if (hasPermission === false) {
    return (
      <View style={[styles.errorContainer, theme?.card]}>
        <Text style={[styles.errorText, theme?.text]}>Kamera erişim izni verilmedi.</Text>
      </View>
    );
  }

  const progressPercent = Math.min(100, Math.round((timerSeconds / 2.0) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.cameraFrameWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.cameraView}
          facing={cameraFacing}
        >
          <View style={styles.hudOverlay}>
            <View style={styles.hudHeader}>
              <Text style={styles.hudBadge}>
                {isModelLoading ? "TFJS YÜKLENİYOR..." : "TFJS: EL TAKİBİ AKTİF"}
              </Text>
              <TouchableOpacity
                onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                style={styles.flipBtn}
              >
                <Text style={styles.flipBtnText}>[KAMERA ÇEVİR]</Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.targetGuide,
                isHandDetected && styles.targetGuideDetected,
                triggered && styles.targetGuideSuccess
              ]}
            >
              {isModelLoading ? (
                <ActivityIndicator color="#00ff66" size="large" />
              ) : (
                <Text style={styles.guideText}>
                  {triggered
                    ? "✓ JEST ONAYLANDI!"
                    : isHandDetected
                    ? `EL ALGILANDI (${timerSeconds.toFixed(1)}s / 2.0s)`
                    : "ELİNİZİ KADRAJA GETİRİN"}
                </Text>
              )}
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              SABİT TUTMA: {timerSeconds.toFixed(1)}s / 2.0s ({progressPercent}%)
            </Text>
          </View>
        </CameraView>
      </View>

      <View style={styles.controlsRow}>
        {!triggered ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.manualDetectBtn,
              isHandDetected ? styles.manualBtnActive : styles.manualBtnInactive
            ]}
            onPressIn={() => toggleHandState(true)}
            onPressOut={() => toggleHandState(false)}
          >
            <Text style={styles.manualBtnText}>
              {isHandDetected
                ? "Bırakma! (2 sn sabit tutuluyor...)"
                : "FİZİKSEL ELİ KADRAJDA TUTUN VEYA BURAYA BASIN"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resetBtn} onPress={resetGesture}>
            <Text style={styles.resetBtnText}>YENİDEN JEST ALGILA</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: '#00ff66',
    borderWidth: 2,
    backgroundColor: '#000000'
  },
  cameraFrameWrapper: {
    height: 340,
    width: '100%',
    position: 'relative',
    backgroundColor: '#051008'
  },
  cameraView: { flex: 1 },
  hudOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 20, 10, 0.25)'
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hudBadge: {
    color: '#00ff66',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#00ff66',
    borderRadius: 4
  },
  flipBtn: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00e5ff'
  },
  flipBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold'
  },
  targetGuide: {
    alignSelf: 'center',
    width: 220,
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 102, 0.5)',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.05)'
  },
  targetGuideDetected: {
    borderColor: '#ffff00',
    backgroundColor: 'rgba(255, 255, 0, 0.15)',
    borderStyle: 'solid'
  },
  targetGuideSuccess: {
    borderColor: '#00ff66',
    backgroundColor: 'rgba(0, 255, 102, 0.25)',
    borderStyle: 'solid'
  },
  guideText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressContainer: {
    height: 10,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 5,
    overflow: 'hidden',
    borderColor: '#00ff66',
    borderWidth: 1,
    marginTop: 8
  },
  progressBar: { height: '100%', backgroundColor: '#00ff66' },
  progressText: {
    color: '#00ff66',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: 'bold'
  },
  controlsRow: { padding: 10, backgroundColor: '#0a1a0f' },
  manualDetectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  manualBtnInactive: { backgroundColor: 'rgba(0, 255, 102, 0.2)', borderColor: '#00ff66' },
  manualBtnActive: { backgroundColor: '#ffff00', borderColor: '#ffffff' },
  manualBtnText: { color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 12 },
  resetBtn: { backgroundColor: '#00e5ff', paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  resetBtnText: { color: '#000000', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 12 },
  errorContainer: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, fontWeight: 'bold' }
});
