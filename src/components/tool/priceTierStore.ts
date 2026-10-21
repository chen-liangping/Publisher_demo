'use client'

// 价格档位共享 mock store（原型用，无后端）
// - PLATFORM_MASTER_TIERS：平台全量「CNY↔各币种」主表（CNY 档位为主键，同一个 JPY 可能对应多个 CNY 档位）
// - 游戏档位（gameTiers）：国际化 → 多币种定价页展示的、本游戏已配置的档位
// 礼包道具「立即同步」时会用礼包 price_jpy 比对游戏档位，缺失的从主表补入；国际化页通过 useGamePriceTiers 实时回显

import { useSyncExternalStore } from 'react'

export interface PriceTier {
  key: string
  cnyTier: number
  jpy: number
  usd: number
  aud: number
  gbp: number
  cad: number
  twd: number
  eur: number
  /** 由礼包同步自动补入的档位（用于国际化页标记） */
  addedBySync?: boolean
}

const tier = (cnyTier: number, jpy: number, usd: number, aud: number, gbp: number, cad: number, twd: number, eur: number): PriceTier => ({
  key: String(cnyTier), cnyTier, jpy, usd, aud, gbp, cad, twd, eur
})

/** 平台全量主表（mock） */
export const PLATFORM_MASTER_TIERS: PriceTier[] = [
  tier(0.5, 10, 0.09, 0.19, 0.09, 0.19, 3, 0.09),
  tier(1, 20, 0.19, 0.29, 0.19, 0.29, 5, 0.19),
  tier(2, 30, 0.29, 0.39, 0.19, 0.39, 7, 0.29),
  tier(3, 50, 0.39, 0.59, 0.29, 0.49, 11, 0.39),
  tier(4, 80, 0.59, 0.89, 0.49, 0.79, 18, 0.59),
  tier(5, 90, 0.69, 0.99, 0.59, 0.89, 20, 0.69),
  tier(6, 100, 0.79, 1.09, 0.69, 0.99, 22, 0.79),
  tier(7, 120, 0.99, 1.29, 0.89, 1.19, 25, 0.99),
  tier(8, 150, 1.29, 1.59, 1.19, 1.49, 30, 1.29),
  tier(9, 180, 1.59, 1.89, 1.49, 1.79, 35, 1.59),
  tier(10, 200, 1.79, 2.09, 1.69, 1.99, 40, 1.79),
  tier(12, 250, 1.99, 2.99, 1.69, 2.49, 55, 1.99),
  tier(15, 300, 2.49, 3.49, 1.99, 2.99, 65, 2.49),
  tier(18, 370, 2.99, 3.99, 2.49, 3.49, 80, 2.99),
  tier(25, 500, 3.49, 4.99, 2.99, 4.49, 110, 3.49),
  tier(26, 500, 3.49, 5.49, 2.99, 4.99, 110, 3.49),
  tier(30, 610, 3.99, 5.99, 3.49, 5.49, 130, 3.99),
  tier(40, 800, 5.49, 7.99, 4.49, 7.49, 170, 5.49),
  tier(45, 890, 5.99, 8.99, 4.99, 7.99, 190, 5.99),
  tier(46, 890, 6.49, 9.49, 5.49, 8.49, 190, 6.49),
  tier(50, 980, 6.99, 9.99, 5.99, 8.99, 210, 6.99),
  tier(68, 1300, 8.99, 13.99, 7.99, 11.99, 290, 8.99),
  tier(98, 1900, 12.99, 19.99, 10.99, 17.99, 420, 12.99),
  tier(128, 2440, 16.99, 25.99, 14.99, 22.99, 540, 16.99),
  tier(198, 3800, 26.99, 39.99, 22.99, 35.99, 840, 26.99),
  tier(328, 6100, 43.99, 64.99, 37.99, 58.99, 1350, 43.99),
  tier(648, 12000, 86.99, 129.99, 74.99, 115.99, 2690, 86.99)
]

/** 游戏当前已配置档位（初始与国际化页原有数据一致：CNY 0.5 ~ 10） */
let gameTiers: PriceTier[] = PLATFORM_MASTER_TIERS.filter(t => t.cnyTier <= 10)
const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const getSnapshot = (): PriceTier[] => gameTiers

export function getGamePriceTiers(): PriceTier[] {
  return gameTiers
}

/** 国际化页使用：订阅游戏档位变化 */
export function useGamePriceTiers(): PriceTier[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** 将主表中的档位加入游戏档位（已存在的 CNY 档位跳过，避免重复添加），返回实际新增的档位 */
export function addGamePriceTiers(tiers: PriceTier[], fromGiftSync: boolean = true): PriceTier[] {
  const existed = new Set(gameTiers.map(t => t.cnyTier))
  const toAdd = tiers.filter(t => !existed.has(t.cnyTier)).map(t => ({ ...t, addedBySync: fromGiftSync }))
  if (toAdd.length === 0) return []
  gameTiers = [...gameTiers, ...toAdd].sort((a, b) => a.cnyTier - b.cnyTier)
  listeners.forEach(l => l())
  return toAdd
}

export interface MissingJpyCheck {
  jpy: number
  /** 主表中该 JPY 对应的全部 CNY 档位；为空表示主表中无可用档位 */
  masterTiers: PriceTier[]
}

/** 比对礼包价格：返回游戏档位 JPY 列中找不到的价格，及其在主表中对应的全部 CNY 档位 */
export function checkMissingJpyTiers(pricesJpy: number[]): MissingJpyCheck[] {
  const gameJpy = new Set(gameTiers.map(t => t.jpy))
  const missing = Array.from(new Set(pricesJpy)).filter(p => !gameJpy.has(p)).sort((a, b) => a - b)
  return missing.map(jpy => ({
    jpy,
    masterTiers: PLATFORM_MASTER_TIERS.filter(t => t.jpy === jpy)
  }))
}

/** 汇率表中与给定 JPY 最接近的可用价格（低于 / 高于各一个），用于提示用户改用其他档位 */
export function findNearestJpy(jpy: number): { lower?: number; higher?: number } {
  const all = Array.from(new Set(PLATFORM_MASTER_TIERS.map(t => t.jpy))).sort((a, b) => a - b)
  const lower = all.filter(p => p < jpy).pop()
  const higher = all.find(p => p > jpy)
  return { lower, higher }
}
