import React, { useState, useEffect, Component } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ActivityIndicator, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { THEMES } from './src/theme/themes';
import { ServerDrivenUI } from './src/components/ServerDrivenUI';
import { fetchVisionUXPayload, getLevelFallbackPayload } from './src/services/gemini';
import { getUserProgress, syncProgress } from './src/services/firebase';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("[ErrorBoundary]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorSafe}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Uygulama İçi Hata Yakalandı</Text>
            <Text style={styles.errorDesc}>{this.state.error?.toString()}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.retryBtnText}>YENİDEN DENE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [user, setUser] = useState({ uid: 'engineer_enes', xp: 50, level: 1 });
  const [payload, setPayload] = useState(() => getLevelFallbackPayload(1, 50));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const calculateLevel = (xp) => {
    if (xp >= 300) return 3;
    if (xp >= 100) return 2;
    return 1;
  };

  const getThemeForLevel = (lvl) => {
    if (lvl === 1) return 'standard_light';
    if (lvl === 2) return 'wcag_dark_mode';
    return 'mediapipe_terminal';
  };

  const initApp = async () => {
    try {
      const profile = await getUserProgress(user.uid);
      const initialXP = profile?.xp ?? 50;
      const initialLevel = calculateLevel(initialXP);
      const currentUser = { uid: user.uid, xp: initialXP, level: initialLevel };
      setUser(currentUser);

      const uiPayload = await fetchVisionUXPayload(initialLevel, initialXP);
      if (uiPayload) setPayload(uiPayload);
    } catch (e) {
      // Offline fallback
    }
  };

  // İstenilen Seviyeye Manuel Geçiş (Eski Görevlere Dönüş)
  const handleSelectLevel = async (targetLevel) => {
    setLoading(true);
    try {
      const updatedUser = { ...user, level: targetLevel };
      setUser(updatedUser);
      const nextPayload = await fetchVisionUXPayload(targetLevel, user.xp);
      if (nextPayload) setPayload(nextPayload);
    } catch (e) {
      // safe
    } finally {
      setLoading(false);
    }
  };

  // Görev tamamlandığında XP artırma ve Seviye geçişi
  const handleQuestCompleted = async () => {
    const reward = payload?.quest?.xp_reward || 80;
    const newXP = user.xp + reward;
    const oldLevel = user.level;
    const newLevel = calculateLevel(newXP);

    const updatedUser = { ...user, xp: newXP, level: newLevel };
    setUser(updatedUser);

    syncProgress(user.uid, newXP, newLevel).catch(() => {});

    if (newLevel > oldLevel) {
      Alert.alert(
        `🎉 TEBRİKLER: SEVİYE ${newLevel} AÇILDI!`,
        `+${reward} XP kazandınız! Yeni algoritmalar ve görüntü işleme araçları aktif edildi.`
      );
    } else {
      Alert.alert(
        'GÖREV TAMAMLANDI!',
        `+${reward} XP kazandınız! Toplam XP: ${newXP} (Seviye ${newLevel})`
      );
    }

    setLoading(true);
    try {
      const nextPayload = await fetchVisionUXPayload(newLevel, newXP);
      if (nextPayload) setPayload(nextPayload);
    } catch (e) {
      // safe
    } finally {
      setLoading(false);
    }
  };

  const currentThemeKey = payload?.theme || getThemeForLevel(user.level);
  const activeTheme = THEMES[currentThemeKey] || THEMES.standard_light;

  return (
    <SafeAreaView style={[styles.container, activeTheme.container]}>
      <StatusBar barStyle="light-content" />

      {/* Cyberpunk Üst Bilgi Barı */}
      <View style={styles.topHudBar}>
        <View>
          <Text style={styles.pilotTag}>MÜHENDİS: ENES</Text>
          <Text style={styles.roleSub}>BİLGİSAYARLI GÖRÜ MİMARI</Text>
        </View>

        <View style={styles.statBadges}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>SEVİYE {user.level}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>{user.xp} XP</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00f0ff" />
          <Text style={styles.loadingText}>ALGORİTMA YÜKLENİYOR...</Text>
        </View>
      ) : (
        <ServerDrivenUI
          payload={payload}
          themeKey={currentThemeKey}
          onTaskComplete={handleQuestCompleted}
          onSelectLevel={handleSelectLevel}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070b14' },
  topHudBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#09101d'
  },
  pilotTag: { color: '#f8fafc', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  roleSub: { color: '#64748b', fontSize: 9, letterSpacing: 0.5, marginTop: 1 },
  statBadges: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: {
    backgroundColor: '#082f49',
    borderColor: '#00f0ff',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 6
  },
  levelBadgeText: { color: '#00f0ff', fontSize: 10, fontWeight: '900' },
  xpBadge: {
    backgroundColor: '#142a1d',
    borderColor: '#22c55e',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  xpBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '900' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 14, fontSize: 11, color: '#00f0ff', fontFamily: 'monospace' },
  errorSafe: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
  errorCard: { padding: 20, backgroundColor: '#1a0505', borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  errorTitle: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  errorDesc: { color: '#ffffff', fontSize: 12, marginBottom: 16 },
  retryBtn: { backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: 'bold' }
});
