import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

/**
 * 4 Yıllık Mühendislik & CV Yol Haritası (Eski Seviyelere Tıklayarak Geçiş Yapılabilir)
 */
export function QuestRoadmap({ currentLevel, onSelectLevel }) {
  const levels = [
    { lvl: 1, title: 'YIL 1: PİKSEL & MATRİS', desc: 'Dokunulan pikselin 3x3 RGB analizi ve gri ton formülü' },
    { lvl: 2, title: 'YIL 2: KERNEL & FİLTRE', desc: 'Sobel, Laplacian kenar tespiti ve canlı eşik kaydırıcısı' },
    { lvl: 3, title: 'YIL 3: EL TAKİBİ & JEST', desc: 'Kameradan el jestiyle temassız arayüz aksiyonu' },
    { lvl: 4, title: 'YIL 4: OTONOM SİSTEMLER', desc: 'Uç cihaz model optimizasyonu (İleri Seviye)' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.mapTitle}>MÜHENDİSLİK EVRİM AĞACI</Text>
        <Text style={styles.subHint}>[İstediğiniz yıla tıklayarak geçiş yapabilirsiniz]</Text>
      </View>

      <View style={styles.track}>
        {levels.map((item, index) => {
          const isCurrent = currentLevel === item.lvl;

          return (
            <TouchableOpacity
              key={item.lvl}
              activeOpacity={0.7}
              onPress={() => onSelectLevel && onSelectLevel(item.lvl)}
              style={[
                styles.milestoneCard,
                isCurrent && styles.milestoneCardActive
              ]}
            >
              <View style={[styles.lvlBadge, isCurrent && styles.lvlBadgeActive]}>
                <Text style={[styles.lvlBadgeText, isCurrent && styles.lvlBadgeTextActive]}>
                  {item.lvl}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.milestoneTitle, isCurrent && { color: '#00f0ff' }]}>
                    {item.title}
                  </Text>
                  {isCurrent && <Text style={styles.activeTag}>AKTİF</Text>}
                </View>
                <Text style={styles.milestoneDesc}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#070f1e',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  mapTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5
  },
  subHint: { fontSize: 9, color: '#38bdf8', fontStyle: 'italic' },
  track: { gap: 6 },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  milestoneCardActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: '#00f0ff'
  },
  lvlBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  lvlBadgeActive: { backgroundColor: '#00f0ff' },
  lvlBadgeText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  lvlBadgeTextActive: { color: '#000000', fontWeight: '900' },
  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { fontSize: 11, fontWeight: 'bold', color: '#cbd5e1' },
  activeTag: {
    fontSize: 8,
    color: '#000000',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    fontWeight: '900'
  },
  milestoneDesc: { fontSize: 9, color: '#64748b', marginTop: 1 }
});
