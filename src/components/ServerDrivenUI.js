import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { THEMES } from '../theme/themes';
import { VisionQuestEngine } from './VisionQuestEngine';
import { QuestRoadmap } from './QuestRoadmap';

/**
 * ServerDrivenUI: Oyunlaştırılmış Bilgisayarlı Görü ve Seviye Motoru
 */
export function ServerDrivenUI({ payload, themeKey, onAction, onTaskComplete, onSelectLevel }) {
  const theme = THEMES[themeKey] || THEMES.standard_light;
  const quest = payload?.quest;
  const level = payload?.level || 1;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 1. 4 Yıllık Mühendislik Yol Haritası (Eski Seviyelere Tıklayarak Geçiş) */}
      <QuestRoadmap currentLevel={level} onSelectLevel={onSelectLevel} />

      {/* 2. Görev Başlık & Detay Kartı */}
      <View style={[styles.questCard, { borderColor: theme?.accent || '#00f0ff' }]}>
        <View style={styles.questHeaderRow}>
          <Text style={styles.yearTag}>YIL {level} // EĞİTİM GÖREVİ</Text>
          <Text style={[styles.rewardTag, { color: theme?.neonColor || '#00f0ff' }]}>
            ÖDÜL: +{quest?.xp_reward || 80} XP
          </Text>
        </View>
        <Text style={styles.questTitle}>{quest?.title}</Text>
        <Text style={styles.questDesc}>{quest?.description}</Text>
      </View>

      {/* 3. GERÇEK ZAMANLI KAMERA, MATRİS VE EL TAKİBİ OYUN MOTORU */}
      <VisionQuestEngine
        level={level}
        quest={quest}
        theme={theme}
        onTaskComplete={() => {
          if (onTaskComplete) {
            onTaskComplete();
          } else if (onAction) {
            onAction('complete_quest', quest);
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 12, paddingBottom: 50 },
  questCard: {
    backgroundColor: '#0a1222',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4
  },
  questHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  yearTag: { fontSize: 9, color: '#64748b', fontWeight: '900', letterSpacing: 1 },
  rewardTag: { fontSize: 11, fontWeight: 'bold' },
  questTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  questDesc: { fontSize: 11, color: '#94a3b8', lineHeight: 16 }
});
