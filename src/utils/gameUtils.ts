import type { TimeOfDay, MoodLevel, GameConfig, CharacterConfig, GiftHistoryEntry, GiftTrendPoint, PreferenceHint } from '../types/game'

export function getMoodLevel(mood: number): MoodLevel {
  if (mood >= 80) return 'happy'
  if (mood >= 60) return 'good'
  if (mood >= 40) return 'neutral'
  if (mood >= 20) return 'bad'
  return 'angry'
}

export function getMoodColor(mood: number): string {
  const level = getMoodLevel(mood)
  const colors: Record<MoodLevel, string> = {
    happy: '#22c55e',
    good: '#84cc16',
    neutral: '#eab308',
    bad: '#f97316',
    angry: '#ef4444'
  }
  return colors[level]
}

export function getMoodLabel(mood: number): string {
  const level = getMoodLevel(mood)
  const labels: Record<MoodLevel, string> = {
    happy: '开心',
    good: '不错',
    neutral: '一般',
    bad: '低落',
    angry: '生气'
  }
  return labels[level]
}

export function getTimeLabel(time: TimeOfDay): string {
  const labels: Record<TimeOfDay, string> = {
    morning: '早晨',
    afternoon: '下午',
    evening: '傍晚',
    night: '深夜'
  }
  return labels[time]
}

export function getTimeIcon(time: TimeOfDay): string {
  const icons: Record<TimeOfDay, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙'
  }
  return icons[time]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getAffinityColor(affinity: number, maxAffinity: number): string {
  const ratio = affinity / maxAffinity
  if (ratio >= 0.8) return '#ec4899'
  if (ratio >= 0.6) return '#f472b6'
  if (ratio >= 0.4) return '#fb923c'
  if (ratio >= 0.2) return '#fbbf24'
  if (ratio >= 0) return '#94a3b8'
  return '#64748b'
}

export function getAffinityStage(affinity: number): string {
  if (affinity >= 80) return '恋人'
  if (affinity >= 60) return '亲密'
  if (affinity >= 40) return '好友'
  if (affinity >= 20) return '朋友'
  if (affinity >= 0) return '相识'
  return '陌生'
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b'
  }
  return colors[rarity] || '#94a3b8'
}

export function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return labels[rarity] || '普通'
}

export function getNextTimeSlot(current: TimeOfDay, timeSlots: TimeOfDay[]): TimeOfDay {
  const index = timeSlots.indexOf(current)
  if (index < timeSlots.length - 1) {
    return timeSlots[index + 1]
  }
  return timeSlots[0]
}

export function isGiftLiked(giftId: string, character: CharacterConfig): boolean {
  return character.favoriteGifts.includes(giftId)
}

export function isGiftDisliked(giftId: string, character: CharacterConfig): boolean {
  return character.dislikedGifts.includes(giftId)
}

export function calculateChatAffinity(
  topic: string,
  character: CharacterConfig,
  mood: number,
  timeOfDay: TimeOfDay
): number {
  const topicConfig = character.chatTopics.find(t => t.topic === topic)
  let baseChange = topicConfig ? topicConfig.affinity : 0

  const moodMultiplier = 0.5 + (mood / 100)
  baseChange *= moodMultiplier

  if (timeOfDay === 'night' && character.baseMood < 50) {
    baseChange *= 0.7
  }
  if (timeOfDay === 'morning' && character.baseMood >= 60) {
    baseChange *= 1.2
  }

  return Math.round(baseChange * 10) / 10
}

export function calculateGiftAffinity(
  giftId: string,
  character: CharacterConfig,
  giftPrice: number,
  mood: number
): number {
  let baseChange = giftPrice / 10

  if (isGiftLiked(giftId, character)) {
    baseChange *= 2
  } else if (isGiftDisliked(giftId, character)) {
    baseChange *= -0.5
  }

  const moodMultiplier = 0.6 + (mood / 150)
  baseChange *= moodMultiplier

  return Math.round(baseChange * 10) / 10
}

const giftCategoryMap: Record<string, string> = {
  flower: 'nature',
  book: 'culture',
  tea: 'culture',
  coffee: 'food',
  dessert: 'food',
  game_console: 'entertainment',
  alcohol: 'drink',
  music_box: 'culture'
}

const topicCategoryMap: Record<string, string[]> = {
  '文学': ['culture'],
  '花草': ['nature'],
  '天气': ['nature'],
  '游戏': ['entertainment'],
  '运动': ['entertainment'],
  '美食': ['food'],
  '音乐': ['culture']
}

export function getGiftCategory(giftId: string): string {
  return giftCategoryMap[giftId] || 'other'
}

export function generatePreferenceHints(character: CharacterConfig): PreferenceHint[] {
  const hints: PreferenceHint[] = []

  const topicCategories = new Set<string>()
  character.chatTopics
    .filter(t => t.affinity >= 2)
    .forEach(t => {
      const cats = topicCategoryMap[t.topic] || []
      cats.forEach(c => topicCategories.add(c))
    })

  const dislikeCategories = new Set<string>()
  character.chatTopics
    .filter(t => t.affinity <= -1)
    .forEach(t => {
      const cats = topicCategoryMap[t.topic] || []
      cats.forEach(c => dislikeCategories.add(c))
    })

  const topTopics = character.chatTopics
    .filter(t => t.affinity >= 2)
    .map(t => t.topic)

  const hintTemplates: Record<string, { positive: string[]; negative: string[] }> = {
    nature: {
      positive: ['似乎对自然相关的事物很有好感', '好像喜欢花草自然类的礼物'],
      negative: ['对自然类的东西不太感冒']
    },
    culture: {
      positive: ['看起来偏爱文艺类的东西', '似乎对文化艺术情有独钟'],
      negative: ['对文艺类的东西兴致平平']
    },
    food: {
      positive: ['似乎对美食毫无抵抗力', '好像很喜欢吃的喝的'],
      negative: ['对食物不太执着']
    },
    entertainment: {
      positive: ['看起来很享受娱乐活动', '似乎对游戏类很感兴趣'],
      negative: ['对娱乐类不太感兴趣']
    },
    drink: {
      positive: ['似乎不排斥品饮类礼物'],
      negative: ['对酒类饮品似乎不太喜欢']
    }
  }

  const allGifts = [
    { id: 'flower', cat: 'nature' },
    { id: 'book', cat: 'culture' },
    { id: 'tea', cat: 'culture' },
    { id: 'coffee', cat: 'food' },
    { id: 'dessert', cat: 'food' },
    { id: 'game_console', cat: 'entertainment' },
    { id: 'alcohol', cat: 'drink' },
    { id: 'music_box', cat: 'culture' }
  ]

  allGifts.forEach(gift => {
    const cat = gift.cat
    const templates = hintTemplates[cat]
    if (!templates) return

    let hint = ''
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let icon = '💭'

    if (topicCategories.has(cat)) {
      const pool = templates.positive
      hint = pool[Math.floor(Math.random() * pool.length)]
      confidence = 'medium'
      icon = '👍'
    } else if (dislikeCategories.has(cat)) {
      const pool = templates.negative
      hint = pool[Math.floor(Math.random() * pool.length)]
      confidence = 'medium'
      icon = '⚠️'
    } else {
      hint = '暂时看不出偏好'
      confidence = 'low'
      icon = '❓'
    }

    if (isGiftLiked(gift.id, character)) {
      if (topTopics.length > 0) {
        hint = `听说ta对${topTopics[0]}很感兴趣，这类礼物或许不错`
      }
      confidence = 'high'
      icon = '💡'
    } else if (isGiftDisliked(gift.id, character)) {
      hint = '感觉ta可能不太喜欢这类东西...'
      confidence = 'high'
      icon = '🚫'
    }

    hints.push({
      giftId: gift.id,
      hint,
      confidence,
      icon
    })
  })

  return hints
}

export function calculateGiftTrend(
  history: GiftHistoryEntry[],
  characterId: string
): GiftTrendPoint[] {
  return history
    .filter(h => h.characterId === characterId)
    .map(h => ({
      day: h.day,
      affinity: h.affinityAfter,
      delta: Math.round((h.affinityAfter - h.affinityBefore) * 10) / 10,
      giftName: ''
    }))
}

export function getBudgetWarning(
  currentResources: number,
  giftPrice: number,
  avgDailyIncome: number
): { level: 'safe' | 'caution' | 'danger'; message: string } | null {
  const remaining = currentResources - giftPrice
  if (remaining < 0) return null

  if (remaining === 0) {
    return {
      level: 'danger',
      message: '送出后将花光所有代币，无法进行其他消费！'
    }
  }
  if (remaining < avgDailyIncome * 0.5) {
    return {
      level: 'caution',
      message: `送出后仅剩 ${remaining} 代币，建议预留部分预算`
    }
  }
  if (remaining < avgDailyIncome) {
    return {
      level: 'safe',
      message: `送出后剩余 ${remaining} 代币，预算尚可`
    }
  }
  return null
}

export function getAffinityTrendLabel(history: GiftHistoryEntry[], characterId: string): string {
  const charHistory = history.filter(h => h.characterId === characterId)
  if (charHistory.length === 0) return '暂无送礼记录'

  const recent = charHistory.slice(-3)
  const avgDelta = recent.reduce((sum, h) => sum + (h.affinityAfter - h.affinityBefore), 0) / recent.length

  if (avgDelta >= 5) return '🔥 好感飙升中！'
  if (avgDelta >= 2) return '😊 好感稳步上升'
  if (avgDelta >= 0) return '😐 好感变化不大'
  if (avgDelta >= -2) return '😟 好感略有下降'
  return '😢 好感急剧下降！'
}
