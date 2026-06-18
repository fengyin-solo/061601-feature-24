<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import gameConfig from '../config/gameConfig'
import type { PreferenceHint } from '../types/game'
import {
  isGiftLiked,
  isGiftDisliked,
  generatePreferenceHints,
  getBudgetWarning,
  calculateGiftTrend,
  getAffinityTrendLabel
} from '../utils/gameUtils'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const selectedGiftId = ref<string | null>(null)
const showTrendPanel = ref(false)
const giftSent = ref(false)

const currentCharacterConfig = computed(() => gameStore.currentCharacterConfig)

const preferenceHints = computed<PreferenceHint[]>(() => {
  if (!currentCharacterConfig.value) return []
  return generatePreferenceHints(currentCharacterConfig.value)
})

function getHintForGift(giftId: string): PreferenceHint | undefined {
  return preferenceHints.value.find(h => h.giftId === giftId)
}

const canAfford = computed(() => {
  if (!selectedGiftId.value) return false
  const gift = gameConfig.gifts.find(g => g.id === selectedGiftId.value)
  return gift ? gameStore.resources >= gift.price : false
})

const budgetWarning = computed(() => {
  if (!selectedGiftId.value) return null
  const gift = gameConfig.gifts.find(g => g.id === selectedGiftId.value)
  if (!gift) return null
  const avgDaily = (gameConfig.workRewards.min + gameConfig.workRewards.max) / 2
  return getBudgetWarning(gameStore.resources, gift.price, avgDaily)
})

const remainingAfterGift = computed(() => {
  if (!selectedGiftId.value) return gameStore.resources
  const gift = gameConfig.gifts.find(g => g.id === selectedGiftId.value)
  return gift ? gameStore.resources - gift.price : gameStore.resources
})

const todayGiftSpent = computed(() => {
  const todayEntries = gameStore.giftHistory.filter(
    h => h.day === gameStore.day && h.characterId === gameStore.selectedCharacterId
  )
  return todayEntries.reduce((sum, h) => {
    const gift = gameConfig.gifts.find(g => g.id === h.giftId)
    return sum + (gift?.price || 0)
  }, 0)
})

const giftTrend = computed(() => {
  if (!gameStore.selectedCharacterId) return []
  return calculateGiftTrend(gameStore.giftHistory, gameStore.selectedCharacterId)
})

const trendLabel = computed(() => {
  if (!gameStore.selectedCharacterId) return ''
  return getAffinityTrendLabel(gameStore.giftHistory, gameStore.selectedCharacterId)
})

const charGiftHistory = computed(() => {
  if (!gameStore.selectedCharacterId) return []
  return gameStore.giftHistory
    .filter(h => h.characterId === gameStore.selectedCharacterId)
    .slice(-5)
    .reverse()
})

function getConfidenceClass(confidence: string): string {
  if (confidence === 'high') return 'confidence-high'
  if (confidence === 'medium') return 'confidence-medium'
  return 'confidence-low'
}

function getTrendBarWidth(delta: number): string {
  const maxDelta = 15
  const pct = Math.min(Math.abs(delta) / maxDelta * 100, 100)
  return `${pct}%`
}

function sendGift() {
  if (!selectedGiftId.value || !gameStore.selectedCharacterId) return
  const success = gameStore.performAction('gift', gameStore.selectedCharacterId, selectedGiftId.value, true)
  if (success) {
    giftSent.value = true
    showTrendPanel.value = true
  }
}

function finishAndClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content gift-modal">
        <div class="modal-header">
          <h2>🎁 选择礼物</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div v-if="!currentCharacterConfig" class="no-character">
          请先选择一个角色
        </div>

        <template v-else>
          <div class="gift-target">
            <span class="target-avatar">{{ currentCharacterConfig.avatar }}</span>
            <span class="target-name">送给 {{ currentCharacterConfig.name }}</span>
            <button
              v-if="giftTrend.length > 0"
              class="trend-toggle"
              @click="showTrendPanel = !showTrendPanel"
            >
              📈 趋势
            </button>
          </div>

          <div v-if="showTrendPanel && giftTrend.length > 0" class="trend-panel animate-fade-in">
            <div class="trend-header">
              <span class="trend-label">{{ trendLabel }}</span>
              <span class="trend-count">共送礼 {{ giftTrend.length }} 次</span>
            </div>

            <div class="trend-chart">
              <div
                v-for="(point, idx) in giftTrend.slice(-8)"
                :key="idx"
                class="trend-bar-group"
              >
                <div class="trend-bar-wrapper">
                  <div
                    v-if="point.delta >= 0"
                    class="trend-bar positive"
                    :style="{ height: getTrendBarWidth(point.delta) }"
                  ></div>
                  <div
                    v-else
                    class="trend-bar negative"
                    :style="{ height: getTrendBarWidth(point.delta) }"
                  ></div>
                </div>
                <span class="trend-bar-day">D{{ point.day }}</span>
              </div>
            </div>

            <div v-if="charGiftHistory.length > 0" class="trend-history">
              <div
                v-for="(entry, idx) in charGiftHistory"
                :key="idx"
                class="trend-history-item"
              >
                <span class="history-day">第{{ entry.day }}天</span>
                <span
                  class="history-delta"
                  :class="entry.affinityAfter > entry.affinityBefore ? 'positive' : 'negative'"
                >
                  {{ entry.affinityAfter > entry.affinityBefore ? '+' : '' }}{{
                    Math.round((entry.affinityAfter - entry.affinityBefore) * 10) / 10
                  }}
                </span>
                <span class="history-affinity">好感 {{ entry.affinityAfter }}</span>
              </div>
            </div>
          </div>

          <div class="gift-grid">
            <div
              v-for="gift in gameConfig.gifts"
              :key="gift.id"
              class="gift-item"
              :class="{ selected: selectedGiftId === gift.id, disabled: giftSent || gameStore.resources < gift.price }"
              @click="!giftSent && gameStore.resources >= gift.price && (selectedGiftId = gift.id)"
            >
              <div class="gift-icon">{{ gift.icon }}</div>
              <div class="gift-info">
                <span class="gift-name">{{ gift.name }}</span>
                <span class="gift-desc">{{ gift.description }}</span>
                <span
                  v-if="getHintForGift(gift.id)"
                  class="gift-hint"
                  :class="getConfidenceClass(getHintForGift(gift.id)!.confidence)"
                >
                  {{ getHintForGift(gift.id)!.icon }}
                  {{ getHintForGift(gift.id)!.hint }}
                </span>
              </div>
              <div class="gift-meta">
                <span class="gift-price">💰 {{ gift.price }}</span>
              </div>
            </div>
          </div>

          <div v-if="budgetWarning" class="budget-warning" :class="budgetWarning.level">
            {{ budgetWarning.level === 'danger' ? '🚨' : budgetWarning.level === 'caution' ? '⚠️' : '💡' }}
            {{ budgetWarning.message }}
          </div>

          <div v-if="todayGiftSpent > 0" class="today-spent">
            今日已为该角色花费 💰 {{ todayGiftSpent }}
          </div>
        </template>

        <div class="modal-footer">
          <span class="current-resources">
            当前代币：{{ gameStore.resources }}
            <span v-if="selectedGiftId && !giftSent" class="remaining-resources">
              → 送出后：{{ remainingAfterGift }}
            </span>
          </span>
          <div class="footer-buttons">
            <button class="btn btn-secondary" @click="giftSent ? emit('close') : emit('close')">
              {{ giftSent ? '跳过' : '取消' }}
            </button>
            <button
              v-if="!giftSent"
              class="btn btn-primary"
              :disabled="!selectedGiftId || !canAfford || gameStore.actionsRemaining <= 0"
              @click="sendGift"
            >
              送出
            </button>
            <button
              v-else
              class="btn btn-primary"
              @click="finishAndClose"
            >
              完成 ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gift-modal {
  padding: 24px;
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--accent-light);
}

.no-character {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.gift-target {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--accent-light);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.target-avatar {
  font-size: 24px;
}

.target-name {
  font-weight: 500;
  flex: 1;
}

.trend-toggle {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.trend-toggle:hover {
  background: var(--accent-light);
  color: var(--accent-primary);
}

.trend-panel {
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.trend-label {
  font-weight: 600;
  font-size: 14px;
}

.trend-count {
  font-size: 12px;
  color: var(--text-muted);
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 60px;
  padding: 0 4px;
  margin-bottom: 12px;
}

.trend-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.trend-bar {
  width: 100%;
  min-height: 4px;
  border-radius: 3px 3px 0 0;
  transition: height 0.3s;
}

.trend-bar.positive {
  background: linear-gradient(to top, #86efac, #22c55e);
}

.trend-bar.negative {
  background: linear-gradient(to top, #fca5a5, #ef4444);
}

.trend-bar-day {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.trend-history {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.history-day {
  color: var(--text-muted);
  min-width: 50px;
}

.history-delta {
  font-weight: 600;
  min-width: 40px;
}

.history-delta.positive {
  color: #22c55e;
}

.history-delta.negative {
  color: #ef4444;
}

.history-affinity {
  color: var(--text-secondary);
}

.gift-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.gift-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.gift-item:hover:not(.disabled) {
  background: var(--accent-light);
}

.gift-item.selected {
  border-color: var(--accent-primary);
  background: var(--accent-light);
}

.gift-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gift-icon {
  font-size: 36px;
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.gift-info {
  flex: 1;
  min-width: 0;
}

.gift-name {
  display: block;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.gift-desc {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.gift-hint {
  display: block;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  line-height: 1.4;
}

.gift-hint.confidence-high {
  background: #dcfce7;
  color: #166534;
}

[data-theme='dark'] .gift-hint.confidence-high {
  background: #14532d;
  color: #86efac;
}

.gift-hint.confidence-medium {
  background: #fef3c7;
  color: #92400e;
}

[data-theme='dark'] .gift-hint.confidence-medium {
  background: #451a03;
  color: #fbbf24;
}

.gift-hint.confidence-low {
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.gift-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.gift-price {
  font-weight: 600;
  color: var(--accent-primary);
  font-size: 14px;
}

.budget-warning {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.4;
}

.budget-warning.danger {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme='dark'] .budget-warning.danger {
  background: #7f1d1d;
  color: #fca5a5;
}

.budget-warning.caution {
  background: #fef3c7;
  color: #92400e;
}

[data-theme='dark'] .budget-warning.caution {
  background: #451a03;
  color: #fbbf24;
}

.budget-warning.safe {
  background: #dbeafe;
  color: #1e40af;
}

[data-theme='dark'] .budget-warning.safe {
  background: #1e3a5f;
  color: #93c5fd;
}

.today-spent {
  margin-top: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.current-resources {
  font-size: 14px;
  color: var(--text-secondary);
}

.remaining-resources {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 4px;
}

.footer-buttons {
  display: flex;
  gap: 10px;
}
</style>
