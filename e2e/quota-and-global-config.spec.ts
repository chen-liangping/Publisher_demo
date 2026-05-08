import { expect, test } from '@playwright/test'

/**
 * 与 《游戏配额管理与全局配置-测试用例.md》 中编号对照。
 * UI 用语以 Ant Design 原型为准。
 */

async function openAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 3, name: '管理台' })).toBeVisible()
}

async function openGameDetail(page: import('@playwright/test').Page, appId: string): Promise<void> {
  await openAdmin(page)
  await page.getByRole('button', { name: '游戏管理' }).click()
  await page.getByRole('button', { name: appId }).click()
  await expect(page.getByRole('heading', { name: `应用环境配置 - ${appId}` })).toBeVisible()
}

test.describe('游戏配额管理与全局配置（原型 E2E）', () => {
  test.describe.configure({ mode: 'serial' })

  test('RG-01 · 入口「游戏资源配置」展示资源全局配置', async ({ page }) => {
    await openAdmin(page)
    await page.getByRole('menuitem', { name: '游戏资源配置' }).click()
    await expect(page.getByRole('heading', { name: '资源全局配置' })).toBeVisible()
    await expect(page.getByText('测试环境').first()).toBeVisible()
    await expect(page.getByText('正式环境').first()).toBeVisible()
  })

  test('RG-02 / RG（成功路径） · 存储全局配置可按环境保存', async ({ page }) => {
    await openAdmin(page)
    await page.getByRole('menuitem', { name: '游戏资源配置' }).click()
    await expect(page.getByRole('heading', { name: '资源全局配置' })).toBeVisible()
    await page.locator('[class*="ant-card"]').filter({ hasText: '测试环境' }).getByRole('button', { name: '编辑' }).click()

    await page.getByRole('spinbutton', { name: '* 每游戏存储实例上限' }).fill('8')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-message').getByText(/测试环境存储配额修改成功/u)).toBeVisible()
    await expect(page.getByText('8').nth(1)).toBeVisible()
  })

  test('RG-07 · Redis/Mongo 区间 max < min 时阻断并提示', async ({ page }) => {
    await openAdmin(page)
    await page.getByRole('menuitem', { name: '游戏资源配置' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '测试环境' }).getByRole('button', { name: '编辑' }).click()
    await page.getByRole('tab', { name: 'Redis' }).click()

    const minBox = page.getByRole('spinbutton', { name: '起始值' }).first()
    const maxBox = page.getByRole('spinbutton', { name: '结束值' }).first()
    await minBox.fill('5')
    await maxBox.fill('2')
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-message-notice-error').getByText(/结束值需大于等于起始值/u)).toBeVisible()
  })

  test('GQ-02 · 容器游戏限额只读卡片展示云原生字段，不展示虚机磁盘等', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '资源限额配置' }).click()
    const quotaCard = page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' })
    await expect(quotaCard.getByText('云原生部署').first()).toBeVisible()
    await expect(quotaCard.getByText('Pod 副本上限').first()).toBeVisible()
    await expect(quotaCard.locator(':scope')).not.toContainText('磁盘总容量')
  })

  test('GQ-03 · 虚机游戏限额只读卡片展示虚机字段，不展示 Pod 副本', async ({ page }) => {
    await openGameDetail(page, 'gamedemo')
    await page.getByRole('tab', { name: '资源限额配置' }).click()
    const quotaCard = page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' })
    await expect(quotaCard.getByText('虚机部署').first()).toBeVisible()
    await expect(quotaCard.getByText('磁盘总容量').first()).toBeVisible()
    await expect(quotaCard.locator(':scope')).not.toContainText('Pod 副本上限')
  })

  test('GQ-06 · CPU 配额小于已使用量时表单校验驳回', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '资源限额配置' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' }).getByRole('button', { name: '编辑' }).first().click()
    const cpuLabel = page.getByText('单个应用 CPU 核数', { exact: true })
    await expect(cpuLabel).toBeVisible()
    await page.getByLabel('单个应用 CPU 核数').fill('0')
    await page.getByLabel('单个应用 CPU 核数').blur()
    await expect(page.locator('.ant-form-item-explain-error').filter({ hasText: /不能小于已使用/u })).toBeVisible()
  })

  test('GQ-08 · 限额保存前先弹出二次确认', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '资源限额配置' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' }).getByRole('button', { name: '编辑' }).first().click()
    await page.getByLabel('单个应用 CPU 核数').fill('10')
    await page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' }).getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-modal').getByRole('heading', { name: '确认保存限额配置' })).toBeVisible()
    await page.getByRole('button', { name: '取消' }).first().click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '限额配置' }).getByRole('button', { name: '确认' }).click()
    await page.getByRole('button', { name: /^确认保存$/ }).click()
    await expect(page.locator('.ant-message').getByText(/限额配置已保存/u)).toBeVisible()
  })

  test('HC-07 · 健康检查保存前二次确认', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '健康检查规则' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '健康检查规则' }).getByRole('button', { name: '编辑' }).first().click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '健康检查规则' }).getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-modal').getByRole('heading', { name: '确认保存健康检查规则' })).toBeVisible()
    await page.locator('.ant-modal').filter({ hasText: '确认保存健康检查规则' }).getByRole('button', { name: /^确认保存$/ }).click()
    await expect(page.locator('.ant-message').getByText(/健康检查规则已保存/u)).toBeVisible()
  })

  test('AR-03 · 自动开服配置保存前二次确认', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '自动开服配置' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '自动开服配置' }).getByRole('button', { name: '编辑' }).first().click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '自动开服配置' }).getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-modal').getByRole('heading', { name: '确认保存自动开服配置' })).toBeVisible()
    await page.locator('.ant-modal').filter({ hasText: '确认保存自动开服配置' }).getByRole('button', { name: '取消' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: '自动开服配置' }).getByRole('button', { name: '取消' }).click()
  })

  test('GM-03 / GM-04 · Grafana 完成配置需确认框且确认后变更为已配置', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '游戏初始化' }).click()

    await page.getByRole('button', { name: '完成' }).filter({ hasText: /^完成$/ }).first().click()
    await expect(page.getByRole('dialog').getByText('确认完成配置？')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: '取 消' }).click()

    await expect(page.getByRole('heading', { name: 'Grafana 配置' }).locator('../..')).toContainText('待配置')

    await page.getByRole('heading', { name: 'Grafana 配置' }).locator('../../..').getByRole('button', { name: '完成' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '确 认' }).click()
    await expect(page.locator('.ant-message').getByText(/全局配置已更新/u)).toBeVisible()
    await expect(page.getByText('已配置').first()).toBeVisible()
  })

  test('MSE-G-01 · MSE 保存前有确认弹窗', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: 'MSE 配置' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: 'MSE 配置' }).getByRole('button', { name: '编辑' }).first().click()
    await page.locator('[class*="ant-card"]').filter({ hasText: 'MSE 配置' }).getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.ant-modal').getByRole('heading', { name: '确认保存 MSE 配置' })).toBeVisible()
    await page.locator('.ant-modal').filter({ hasText: '确认保存 MSE 配置' }).getByRole('button', { name: '取消' }).click()
    await page.locator('[class*="ant-card"]').filter({ hasText: 'MSE 配置' }).getByRole('button', { name: '取消' }).click()
  })

  test('MSE-T-01 · MSE 实例类型按列表展示独占/共享', async ({ page }) => {
    await openGameDetail(page, 'gamedemo')
    await page.getByRole('tab', { name: '游戏初始化' }).click()
    await expect(page.locator(':text("独占实例").or(:text("共享实例")).first')).toBeVisible()
  })

  test('GQ-09（片段） · 限额页展示「已使用」用量对比', async ({ page }) => {
    await openGameDetail(page, 'testgame')
    await page.getByRole('tab', { name: '资源限额配置' }).click()
    await expect(page.getByText('已使用').first()).toBeVisible()
  })
})
