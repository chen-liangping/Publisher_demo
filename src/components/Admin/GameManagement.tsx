'use client'

import React, { useState } from 'react'
import { 
  Button, 
  Space, 
  Typography, 
  Card,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Progress,
  Alert,
  Pagination,
  Tooltip
} from 'antd'
import { 
  PlusOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DesktopOutlined,
  SettingOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  LineChartOutlined
} from '@ant-design/icons'

const { Title } = Typography

// 环境配置类型定义
interface EnvironmentConfig {
  clientResource: boolean
  serverResource: boolean
  globalAcceleration: boolean
  flashLaunch: boolean
  grafanaConfig: boolean
  initStatus: 'completed' | 'not_initialized'
}

// 游戏数据类型定义
interface Game {
  id: string
  appId: string
  description: string
  testEnv: EnvironmentConfig
  prodEnv: EnvironmentConfig
  createTime: string
  status?: 'active' | 'offlining' | 'offline'
  offlineLogs?: Array<{ time: string; step: string; status: 'pending' | 'running' | 'success' | 'failed'; detail?: string }>
  offlinePlan?: string[]
}

// 模拟游戏数据
const mockGameData: Game[] = [
  {
    id: 'game-001',
    appId: 'gamedemo',
    description: '示例游戏应用',
    testEnv: {
      clientResource: true,
      serverResource: true,
      globalAcceleration: false,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'completed'
    },
    prodEnv: {
      clientResource: true,
      serverResource: true,
      globalAcceleration: true,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'completed'
    },
    createTime: '2024-01-15 10:30:00'
  },
  {
    id: 'game-002',
    appId: 'testgame',
    description: '测试游戏',
    testEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'not_initialized'
    },
    prodEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'not_initialized'
    },
    createTime: '2024-01-14 15:20:00'
  },
  {
    id: 'game-003',
    appId: 'rpgworld',
    description: 'RPG世界',
    testEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'completed'
    },
    prodEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: false,
      flashLaunch: false,
      grafanaConfig: false,
      initStatus: 'not_initialized'
    },
    createTime: '2024-01-13 09:15:00'
  }
]

export default function GameManagement() {
  const [gameList, setGameList] = useState<Game[]>(mockGameData)
  const [loading, setLoading] = useState<boolean>(false)
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false)
  const [initConfirmed, setInitConfirmed] = useState<boolean>(false)
  const [currentGameData, setCurrentGameData] = useState<Game | null>(null)
  // 已移除初始化中的集合，改用进度弹窗来标识
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [form] = Form.useForm()
  const [offlineConfirmVisible, setOfflineConfirmVisible] = useState<boolean>(false)
  const [offlineTargetGame, setOfflineTargetGame] = useState<Game | null>(null)
  const [offlineAcknowledge, setOfflineAcknowledge] = useState<boolean>(false)
  const [offlineLogsVisible, setOfflineLogsVisible] = useState<boolean>(false)

  // A-1 顶部筛选/排序与统计 & A-3 分页
  const [keyword, setKeyword] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(8)

  // 配置弹窗（表单字段列表）
  type ResourceFormFields = Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch' | 'grafanaConfig'>
  // 新增：添加游戏表单字段类型
  interface AddGameFormValues {
    appId: string
    description?: string
    clientResource: boolean
    serverResource: boolean
    globalAcceleration: boolean
    flashLaunch: boolean
    grafanaConfig: boolean
  }
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false)
  const [configModalGame, setConfigModalGame] = useState<Game | null>(null)
  const [configModalEnv, setConfigModalEnv] = useState<'testEnv' | 'prodEnv' | null>(null)
  const [configForm] = Form.useForm<ResourceFormFields>()
  const [globalAccelLocked, setGlobalAccelLocked] = useState<boolean>(false)
  const [clientResourceLocked, setClientResourceLocked] = useState<boolean>(false)
  const [serverResourceLocked, setServerResourceLocked] = useState<boolean>(false)
  const [globalAccelInitTip, setGlobalAccelInitTip] = useState<boolean>(false)
  const [grafanaLocked, setGrafanaLocked] = useState<boolean>(false)
  const [grafanaInitTip, setGrafanaInitTip] = useState<boolean>(false)
  const [flashLaunchLocked, setFlashLaunchLocked] = useState<boolean>(false)
  const [flashLaunchInitTip, setFlashLaunchInitTip] = useState<boolean>(false)

  // 新增：资源配置确认弹窗状态
  const [resourceConfirmVisible, setResourceConfirmVisible] = useState<boolean>(false)
  const [resourceConfirmData, setResourceConfirmData] = useState<{
    gameId: string
    environment: 'testEnv' | 'prodEnv'
    resourceType: keyof Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch'>
    checked: boolean
    title: string
    content: string
  } | null>(null)

  // 新增：初始化进度状态
  const [initProgressVisible, setInitProgressVisible] = useState<boolean>(false)
  const [initProgressData, setInitProgressData] = useState<{
    gameId: string
    gameName: string
    configs: Array<{ name: string; desc: string; status: 'pending' | 'running' | 'completed' | 'failed' }>
    currentStep: number
    totalSteps: number
  } | null>(null)

  // 新增：初始化确认弹窗状态
  const [initConfirmVisible, setInitConfirmVisible] = useState<boolean>(false)
  const [initConfirmData, setInitConfirmData] = useState<{
    game: Game
    environment: 'testEnv' | 'prodEnv'
    configs: Array<{ name: string; desc: string }>
  } | null>(null)

  // 删除二次确认
  const [deleteConfirmGame, setDeleteConfirmGame] = useState<Game | null>(null)

  // 切换卡片展开状态（当前用在表格型行结构的“展开”按钮）
  const toggleCardExpanded = (gameId: string): void => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  // 删除游戏（仅允许在下线完成后）
  const handleDeleteGame = (game: Game): void => {
    if (game.status !== 'offline') {
      message.warning('需先下线完成后才能删除')
      return
    }
    setDeleteConfirmGame(game)
  }

  // 已移除：开关在表单弹窗统一保存

  // 更新游戏资源状态
  const updateGameResource = (
    gameId: string, 
    environment: 'testEnv' | 'prodEnv',
    resourceType: keyof Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch'>, 
    checked: boolean
  ): void => {
    const updatedGameList = gameList.map(game => {
      if (game.id === gameId) {
        return { 
          ...game, 
          [environment]: {
            ...game[environment],
            [resourceType]: checked
          }
        }
      }
      return game
    })
    setGameList(updatedGameList)
  }

  // 显示资源配置确认弹窗
  // 已移除：统一由表单保存

  // 确认资源配置修改
  const handleResourceConfirm = (): void => {
    if (resourceConfirmData) {
      updateGameResource(
        resourceConfirmData.gameId, 
        resourceConfirmData.environment,
        resourceConfirmData.resourceType, 
        resourceConfirmData.checked
      )
      const resourceNames = {
        clientResource: '客户端资源',
        serverResource: '服务端资源',
        globalAcceleration: '全球加速',
        flashLaunch: 'FlashLaunch'
      }
      const envName = resourceConfirmData.environment === 'testEnv' ? '测试环境' : '生产环境'
      message.success(`${envName}${resourceNames[resourceConfirmData.resourceType]}已${resourceConfirmData.checked ? '开启' : '关闭'}`)
    }
    setResourceConfirmVisible(false)
    setResourceConfirmData(null)
  }

  // 初始化游戏环境
  const handleInitializeGame = (game: Game, environment: 'testEnv' | 'prodEnv'): void => {
    const envConfig = game[environment]
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    
    if (envConfig.initStatus === 'completed') {
      message.warning(`${envName}已完成初始化`)
      return
    }

    // 统计要初始化的配置项
    const initConfigs: Array<{ name: string; desc: string }> = []
    if (envConfig.clientResource) initConfigs.push({ name: '客户端资源', desc: 'S3 和 CDN 初始化' })
    if (envConfig.serverResource) initConfigs.push({ name: '服务端资源', desc: 'K8S 配置初始化' })
    if (envConfig.globalAcceleration) initConfigs.push({ name: '全球加速', desc: '全球节点配置' })
    if (envConfig.flashLaunch) initConfigs.push({ name: 'FlashLaunch', desc: '快速启动配置' })

    if (initConfigs.length === 0) {
      message.warning(`请先配置${envName}至少一项资源后再进行初始化`)
      return
    }

    // 显示初始化确认弹窗
    setInitConfirmData({ game, environment, configs: initConfigs })
    setInitConfirmVisible(true)
  }

  // 确认开始初始化
  const handleConfirmInitialization = (): void => {
    if (initConfirmData) {
      startGameInitializationWithProgress(initConfirmData.game, initConfirmData.environment, initConfirmData.configs)
      setInitConfirmVisible(false)
      setInitConfirmData(null)
    }
  }

  // 开始游戏初始化（带进度显示）
  const startGameInitializationWithProgress = (game: Game, environment: 'testEnv' | 'prodEnv', initConfigs: Array<{ name: string; desc: string }>): void => {
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    const gameEnvId = `${game.id}-${environment}`
    
    // 标记初始化开始（通过进度弹窗）
    
    // 设置初始化进度数据
    const progressConfigs = initConfigs.map(config => ({
      ...config,
      status: 'pending' as const
    }))
    
    setInitProgressData({
      gameId: gameEnvId,
      gameName: `${game.appId} - ${envName}`,
      configs: progressConfigs,
      currentStep: 0,
      totalSteps: initConfigs.length
    })
    setInitProgressVisible(true)

    // 开始逐步初始化
    executeInitializationSteps(game.id, environment, progressConfigs, 0)
  }

  // 模拟下线流程：10% 概率失败，可重试
  const simulateOfflining = (gameId: string): void => {
    const steps = [
      'AliCloud/OSS: 清空并删除 Bucket',
      'AliCloud/RAM: 删除 Access Keys / 删除策略版本与策略 / 删除用户',
      'AliCloud/ACR NS: 删除命名空间（预先清理 PV/PVC，解除 finalizers）',
      'AliCloud/Tair(Redis): 转按量计费并轮询状态后删除实例',
      'AliCloud/K8s: 获取并删除命名空间内 PVC/PV/挂载点',
      'AliCloud/ACK: 删除命名空间（确保已清理 PV&PVC）',
      'AliCloud/PolarDB: 转计费后删除 PRD 集群与 STG 数据库',
      'AliCloud/MSE: 删除网关域名/网关/Ingress/Ingress Class/Configs',
      'AliCloud/GA: 按标签获取并触发删除 Global Accelerator',
      'AWS/CloudFront: 获取 ETag，禁用并删除 Distribution',
      'AWS/S3: 清空并删除 Bucket',
      'AWS/IAM: 删除 Access-Key/Policies/User',
      'AWS/Route53: 删除记录/流量策略/实例',
    ]

    const runStep = (index: number) => {
      if (index >= steps.length) {
        // 全部完成
        setGameList(prev => prev.map(g => {
          if (g.id !== gameId) return g
          const logs = g.offlineLogs ? [...g.offlineLogs] : []
          const lastRunning = logs.findLastIndex(l => l.status === 'running')
          if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: 'success' }
          logs.push({ time: new Date().toLocaleString('zh-CN'), step: '下线完成', status: 'success' })
          return { ...g, status: 'offline', offlineLogs: logs }
        }))
        message.success('下线完成，可以删除该游戏')
        return
      }

      // 将上一条 running 置 success，并插入当前步骤为 running
      setGameList(prev => prev.map(g => {
        if (g.id !== gameId) return g
        const logs = g.offlineLogs ? [...g.offlineLogs] : []
        const lastRunning = logs.findLastIndex(l => l.status === 'running')
        if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: 'success' }
        logs.push({ time: new Date().toLocaleString('zh-CN'), step: steps[index], status: 'running' })
        return { ...g, offlineLogs: logs, status: 'offlining' }
      }))

      const delay = 600 + Math.floor(Math.random() * 400)
      setTimeout(() => {
        const fail = Math.random() < 0.1 // 10% 概率失败
        setGameList(prev => prev.map(g => {
          if (g.id !== gameId) return g
          const logs = g.offlineLogs ? [...g.offlineLogs] : []
          const lastRunning = logs.findLastIndex(l => l.status === 'running')
          if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: fail ? 'failed' : 'success' }
          return { ...g, offlineLogs: logs, status: fail ? 'offlining' : g.status }
        }))

        if (!fail) runStep(index + 1)
      }, delay)
    }

    // 启动
    runStep(0)
  }

  // 重试指定步骤：将该步标记为 running，并再次推进后续步骤
  const retryOfflineStep = (logIndex: number): void => {
    if (!offlineTargetGame) return
    const targetId = offlineTargetGame.id
    // 将失败步骤改为 running，并清理其后续步骤（保持线性推进）
    setGameList(prev => prev.map(g => {
      if (g.id !== targetId) return g
      const logs = g.offlineLogs ? [...g.offlineLogs] : []
      for (let i = logs.length - 1; i > logIndex; i--) logs.pop()
      logs[logIndex] = { ...logs[logIndex], status: 'running' }
      return { ...g, status: 'offlining', offlineLogs: logs }
    }))

    // 继续推进：把该步置 success，再继续后续队列
    setTimeout(() => {
      setGameList(prev => prev.map(g => {
        if (g.id !== targetId) return g
        const logs = g.offlineLogs ? [...g.offlineLogs] : []
        logs[logIndex] = { ...logs[logIndex], status: 'success' }
        return { ...g, offlineLogs: logs }
      }))
      // 继续剩余未执行步骤
      simulateOffliningFrom(targetId, logIndex + 1)
    }, 800)
  }

  // 从指定步骤索引继续推进（基于统一 steps 清单）
  const simulateOffliningFrom = (gameId: string, startIndex: number): void => {
    const steps = [
      'AliCloud/OSS: 清空并删除 Bucket',
      'AliCloud/RAM: 删除 Access Keys / 删除策略版本与策略 / 删除用户',
      'AliCloud/ACR NS: 删除命名空间（预先清理 PV/PVC，解除 finalizers）',
      'AliCloud/Tair(Redis): 转按量计费并轮询状态后删除实例',
      'AliCloud/K8s: 获取并删除命名空间内 PVC/PV/挂载点',
      'AliCloud/ACK: 删除命名空间（确保已清理 PV&PVC）',
      'AliCloud/PolarDB: 转计费后删除 PRD 集群与 STG 数据库',
      'AliCloud/MSE: 删除网关域名/网关/Ingress/Ingress Class/Configs',
      'AliCloud/GA: 按标签获取并触发删除 Global Accelerator',
      'AWS/CloudFront: 获取 ETag，禁用并删除 Distribution',
      'AWS/S3: 清空并删除 Bucket',
      'AWS/IAM: 删除 Access-Key/Policies/User',
      'AWS/Route53: 删除记录/流量策略/实例',
    ]
    const runStep = (i: number) => {
      if (i >= steps.length) {
        setGameList(prev => prev.map(g => {
          if (g.id !== gameId) return g
          const logs = g.offlineLogs ? [...g.offlineLogs] : []
          const lastRunning = logs.findLastIndex(l => l.status === 'running')
          if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: 'success' }
          logs.push({ time: new Date().toLocaleString('zh-CN'), step: '下线完成', status: 'success' })
          return { ...g, status: 'offline', offlineLogs: logs }
        }))
        message.success('下线完成，可以删除该游戏')
        return
      }
      // 将上一条 running 置 success，并插入当前步骤为 running
      setGameList(prev => prev.map(g => {
        if (g.id !== gameId) return g
        const logs = g.offlineLogs ? [...g.offlineLogs] : []
        const lastRunning = logs.findLastIndex(l => l.status === 'running')
        if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: 'success' }
        logs.push({ time: new Date().toLocaleString('zh-CN'), step: steps[i], status: 'running' })
        return { ...g, offlineLogs: logs, status: 'offlining' }
      }))
      const delay = 600 + Math.floor(Math.random() * 400)
      setTimeout(() => {
        const fail = Math.random() < 0.7
        setGameList(prev => prev.map(g => {
          if (g.id !== gameId) return g
          const logs = g.offlineLogs ? [...g.offlineLogs] : []
          const lastRunning = logs.findLastIndex(l => l.status === 'running')
          if (lastRunning >= 0) logs[lastRunning] = { ...logs[lastRunning], status: fail ? 'failed' : 'success' }
          return { ...g, offlineLogs: logs, status: fail ? 'offlining' : g.status }
        }))
        if (!fail) runStep(i + 1)
      }, delay)
    }
    runStep(startIndex)
  }

  // 执行初始化步骤
  const executeInitializationSteps = (gameId: string, environment: 'testEnv' | 'prodEnv', configs: Array<{ name: string; desc: string; status: 'pending' | 'running' | 'completed' | 'failed' }>, currentIndex: number): void => {
    if (currentIndex >= configs.length) {
      // 所有步骤完成
      completeInitialization(gameId, environment)
      return
    }

    // 更新当前步骤状态为运行中
    const updatedConfigs = [...configs]
    updatedConfigs[currentIndex] = { ...updatedConfigs[currentIndex], status: 'running' }
    
    setInitProgressData(prev => prev ? {
      ...prev,
      configs: updatedConfigs,
      currentStep: currentIndex + 1
    } : null)

    // 模拟每个步骤的初始化时间（2-4秒）
    const stepDuration = 2000 + Math.random() * 2000
    
    setTimeout(() => {
      // 模拟成功/失败（90%概率成功）
      const isStepSuccess = Math.random() > 0.1
      
      if (isStepSuccess) {
        // 步骤成功
        updatedConfigs[currentIndex] = { ...updatedConfigs[currentIndex], status: 'completed' }
        setInitProgressData(prev => prev ? {
          ...prev,
          configs: updatedConfigs
        } : null)
        
        // 继续下一步
        setTimeout(() => {
          executeInitializationSteps(gameId, environment, updatedConfigs, currentIndex + 1)
        }, 500)
      } else {
        // 步骤失败
        updatedConfigs[currentIndex] = { ...updatedConfigs[currentIndex], status: 'failed' }
        setInitProgressData(prev => prev ? {
          ...prev,
          configs: updatedConfigs
        } : null)
        
        // 初始化失败
        setTimeout(() => {
          handleInitializationFailure(gameId, environment)
        }, 1000)
      }
    }, stepDuration)
  }

  // 完成初始化
  const completeInitialization = (gameId: string, environment: 'testEnv' | 'prodEnv'): void => {
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    
    // 更新游戏环境状态为已完成初始化
    const updatedGameList = gameList.map(game => {
      if (game.id === gameId) {
        return { 
          ...game, 
          [environment]: {
            ...game[environment],
            initStatus: 'completed' as const
          }
        }
      }
      return game
    })
    setGameList(updatedGameList)
    
    // 完成：关闭进度弹窗
    
    message.success(`${envName}初始化成功！`)
    
    // 2秒后关闭进度弹窗
    setTimeout(() => {
      setInitProgressVisible(false)
      setInitProgressData(null)
    }, 2000)
  }

  // 处理初始化失败
  const handleInitializationFailure = (gameId: string, environment: 'testEnv' | 'prodEnv'): void => {
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    
    
    message.error(`${envName}初始化失败，请稍后重试`)
    
    // 3秒后关闭进度弹窗
    setTimeout(() => {
      setInitProgressVisible(false)
      setInitProgressData(null)
    }, 3000)
  }



  // 表单提交处理
  const handleAddGame = async (values: AddGameFormValues): Promise<void> => {
    // 依赖的前端表单校验均已迁移至 Form.Item 的 rules 中，这里不再做重复校验

    // 创建新游戏对象并显示初始化确认弹窗
    const newGame: Game = {
      id: `game-${Date.now()}`,
      appId: values.appId,
      description: values.description || '新添加的游戏',
      testEnv: {
        initStatus: 'not_initialized' as const,
        clientResource: values.clientResource,
        serverResource: values.serverResource,
        globalAcceleration: values.globalAcceleration,
        flashLaunch: values.flashLaunch,
        grafanaConfig: values.grafanaConfig
      },
      prodEnv: {
        initStatus: 'not_initialized' as const,
        clientResource: values.clientResource,
        serverResource: values.serverResource,
        globalAcceleration: values.globalAcceleration,
        flashLaunch: values.flashLaunch,
        grafanaConfig: values.grafanaConfig
      },
      createTime: new Date().toLocaleString('zh-CN')
    }
    setGameList(prev => [newGame, ...prev])
    setAddModalVisible(false)
    form.resetFields()
    message.success('添加成功')
  }

  // 初始化确认
  const handleInitConfirm = async (): Promise<void> => {
    if (!initConfirmed) {
      message.error('请先勾选确认选项')
      return
    }

    if (!currentGameData) {
      message.error('游戏数据不存在')
      return
    }

    setConfirmModalVisible(false)
    setLoading(true)

    // 显示初始化进行中的提示
    const loadingMessage = message.loading('正在初始化，请稍候…', 0)

    // 模拟初始化过程
    setTimeout(() => {
      loadingMessage()
      
      // 模拟成功/失败（90%概率成功）
      const isSuccess = Math.random() > 0.1

      if (isSuccess) {
        // 添加新游戏到列表
        const newGame: Game = {
          id: `game-${Date.now()}`,
          appId: currentGameData.appId,
          description: currentGameData.description || '',
          testEnv: {
            clientResource: currentGameData.testEnv.clientResource || false,
            serverResource: currentGameData.testEnv.serverResource || false,
            globalAcceleration: currentGameData.testEnv.globalAcceleration || false,
            flashLaunch: currentGameData.testEnv.flashLaunch || false,
            grafanaConfig: currentGameData.testEnv.grafanaConfig || false,
            initStatus: 'not_initialized'
          },
          prodEnv: {
            clientResource: false,
            serverResource: false,
            globalAcceleration: false,
            flashLaunch: false,
            grafanaConfig: false,
            initStatus: 'not_initialized'
          },
          createTime: new Date().toLocaleString('zh-CN')
        }

        setGameList([newGame, ...gameList])
        setLoading(false)
        setInitConfirmed(false)
        setCurrentGameData(null)
        form.resetFields()
        message.success('初始化成功')
      } else {
        // 初始化失败
        setLoading(false)
        setInitConfirmed(false)
        Modal.error({
          title: '初始化失败',
          content: '原因：网络连接超时，请检查网络后重试',
          onOk: () => {
            // 重新打开添加游戏弹窗，保留原表单内容
            setAddModalVisible(true)
            form.setFieldsValue(currentGameData)
          }
        })
      }
    }, 3000)
  }

  // 渲染环境配置卡片（已替换为表单弹窗，不再使用）
  // 已移除：旧抽屉卡片渲染（保留声明避免历史引用报错）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderEnvironmentCard = (_game: Game, _environment: 'testEnv' | 'prodEnv') => null

  // 渲染游戏卡片
  const renderGameCard = (game: Game) => {
    const isExpanded = expandedCards.has(game.id)
    const testCompleted = game.testEnv.initStatus === 'completed'
    const prodCompleted = game.prodEnv.initStatus === 'completed'
    const overallStatusColor = (testCompleted && prodCompleted)
      ? '#52c41a' // 两个环境都初始化：绿色
      : (testCompleted || prodCompleted)
        ? '#faad14' // 仅一个初始化：黄色
        : '#ff4d4f' // 都未初始化：红色

    return (
      <Card
        key={game.id}
        variant="borderless"
        style={{ 
          marginBottom: 16,
          background: '#fff'
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        {/* 卡片头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0, fontSize: '18px', color: game.status === 'offline' ? '#7f8c8d' : '#1890ff' }}>
                {game.appId}
              </Title>
            {/* 总体初始化状态：单一图标按颜色区分 */}
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: overallStatusColor, display: 'inline-block' }} />
            {game.description && (
              <span style={{ color: '#666', fontSize: '12px' }}>
                {game.description}
              </span>
            )}
            <span style={{ color: '#999', fontSize: '12px', marginLeft: 60 }}>
              创建时间：{game.createTime}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button size="small" onClick={() => toggleCardExpanded(game.id)}>{isExpanded ? '收起' : '展开'}</Button>
            {/* 下线：仅当已初始化任一环境才可下线；下线完成后才允许删除 */}
            <Button
              size="small"
              onClick={() => {
                setOfflineTargetGame(game)
                setOfflineAcknowledge(false)
                if (game.status === 'offlining' || game.status === 'offline') {
                  setOfflineLogsVisible(true)
                } else {
                  setOfflineConfirmVisible(true)
                }
              }}
              disabled={game.status === 'active' && (game.testEnv.initStatus !== 'completed' && game.prodEnv.initStatus !== 'completed')}
            >
              {game.status === 'offlining' || game.status === 'offline' ? '下线日志' : '下线'}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGame(game)}
              disabled={game.status !== 'offline'}
              title={game.status !== 'offline' ? '需先下线完成后才能删除' : '删除游戏'}
            >
              删除
            </Button>
          </div>
        </div>

        {/* 表格型展开：默认不显示，由展开按钮控制 */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            {/* 第二行：测试环境 */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fbfffb' }}>
              <Space size={8}>
                {game.status === 'offline' ? (
                  <span style={{ color: '#999', fontWeight: 500 }}>已下线</span>
                ) : (
                  <span title={testCompleted ? '已初始化' : '未初始化'}>
                    {testCompleted ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )}
                  </span>
                )}
                <span style={{ color: '#34495e', fontWeight: 500 }}>测试环境</span>
                {/* 开启的配置以图标展示（带 Tooltip） */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {game.status !== 'offline' && game.testEnv.clientResource && (
                    <Tooltip title="客户端资源">
                      <DesktopOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 15}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.testEnv.serverResource && (
                    <Tooltip title="服务端资源">
                      <SettingOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.testEnv.globalAcceleration && (
                    <Tooltip title="全球加速">
                      <GlobalOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.testEnv.flashLaunch && (
                    <Tooltip title="FlashLaunch">
                      <ThunderboltOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.testEnv.grafanaConfig && (
                    <Tooltip title="Grafana配置">
                      <LineChartOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                </span>
                
              </Space>
              <Space>
                <Button size="small" type="link" onClick={() => handleInitializeGame(game, 'testEnv')} disabled={game.status === 'offline'} title={game.status === 'offline' ? '已下线，无法初始化' : '初始化'}>初始化</Button>
                <Button
                  size="small"
                  onClick={() => {
                    setConfigModalGame(game)
                    setConfigModalEnv('testEnv')
                    // 未初始化环境可自由开关；已初始化且已开启则不可关闭
                    setGlobalAccelLocked(game.testEnv.initStatus === 'completed' && !!game.testEnv.globalAcceleration)
                    // 已初始化：展示全球加速开启不可关闭的提示
                    setGlobalAccelInitTip(game.testEnv.initStatus === 'completed')
                    // grafana配置：已初始化且已开启则不可关闭
                    setGrafanaLocked(game.testEnv.initStatus === 'completed' && !!game.testEnv.grafanaConfig)
                    // 已初始化：展示grafana配置开启不可关闭的提示
                    setGrafanaInitTip(game.testEnv.initStatus === 'completed')
                    // flashlaunch：已初始化且已开启则不可关闭
                    setFlashLaunchLocked(game.testEnv.initStatus === 'completed' && !!game.testEnv.flashLaunch)
                    // 已初始化：展示flashlaunch开启不可关闭的提示
                    setFlashLaunchInitTip(game.testEnv.initStatus === 'completed')
                    setClientResourceLocked(game.testEnv.initStatus === 'completed' && !!game.testEnv.clientResource)
                    setServerResourceLocked(game.testEnv.initStatus === 'completed' && !!game.testEnv.serverResource)
                    configForm.setFieldsValue({
                      clientResource: game.testEnv.clientResource,
                      serverResource: game.testEnv.serverResource,
                      globalAcceleration: game.testEnv.globalAcceleration,
                      flashLaunch: game.testEnv.flashLaunch,
            grafanaConfig: game.testEnv.grafanaConfig
                    })
                    setConfigModalVisible(true)
                  }}
                  disabled={game.status === 'offline'}
                  title={game.status === 'offline' ? '已下线，无法配置' : '配置'}
                >配置</Button>
              </Space>
            </div>
            {/* 第三行：生产环境 */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fbff' }}>
              <Space size={8}>
                {game.status === 'offline' ? (
                  <span style={{ color: '#999', fontWeight: 500 }}>已下线</span>
                ) : (
                  <span title={prodCompleted ? '已初始化' : '未初始化'}>
                    {prodCompleted ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )}
                  </span>
                )}
                <span style={{ color: '#34495e', fontWeight: 500 }}>生产环境</span>
                {/* 开启的配置以图标展示（带 Tooltip） */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {game.status !== 'offline' && game.prodEnv.clientResource && (
                    <Tooltip title="客户端资源">
                      <DesktopOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 15}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.prodEnv.serverResource && (
                    <Tooltip title="服务端资源">
                      <SettingOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.prodEnv.globalAcceleration && (
                    <Tooltip title="全球加速">
                      <GlobalOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.prodEnv.flashLaunch && (
                    <Tooltip title="FlashLaunch">
                      <ThunderboltOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                  {game.status !== 'offline' && game.prodEnv.grafanaConfig && (
                    <Tooltip title="Grafana配置">
                      <LineChartOutlined style={{ color: '#74b9ff', fontSize: 12 ,marginLeft: 3}} />
                    </Tooltip>
                  )}
                </span>
                
              </Space>
              <Space>
                <Button size="small" type="link" onClick={() => handleInitializeGame(game, 'prodEnv')} disabled={game.status === 'offline'} title={game.status === 'offline' ? '已下线，无法初始化' : '初始化'}>初始化</Button>
                <Button
                  size="small"
                  onClick={() => {
                    setConfigModalGame(game)
                    setConfigModalEnv('prodEnv')
                    // 未初始化环境可自由开关；已初始化且已开启则不可关闭
                    setGlobalAccelLocked(game.prodEnv.initStatus === 'completed' && !!game.prodEnv.globalAcceleration)
                    // 已初始化：展示全球加速开启不可关闭的提示
                    setGlobalAccelInitTip(game.prodEnv.initStatus === 'completed')
                    // grafana配置：已初始化且已开启则不可关闭
                    setGrafanaLocked(game.prodEnv.initStatus === 'completed' && !!game.prodEnv.grafanaConfig)
                    // 已初始化：展示grafana配置开启不可关闭的提示
                    setGrafanaInitTip(game.prodEnv.initStatus === 'completed')
                    // flashlaunch：已初始化且已开启则不可关闭
                    setFlashLaunchLocked(game.prodEnv.initStatus === 'completed' && !!game.prodEnv.flashLaunch)
                    // 已初始化：展示flashlaunch开启不可关闭的提示
                    setFlashLaunchInitTip(game.prodEnv.initStatus === 'completed')
                    setClientResourceLocked(game.prodEnv.initStatus === 'completed' && !!game.prodEnv.clientResource)
                    setServerResourceLocked(game.prodEnv.initStatus === 'completed' && !!game.prodEnv.serverResource)
                    configForm.setFieldsValue({
                      clientResource: game.prodEnv.clientResource,
                      serverResource: game.prodEnv.serverResource,
                      globalAcceleration: game.prodEnv.globalAcceleration,
                      flashLaunch: game.prodEnv.flashLaunch,
            grafanaConfig: game.prodEnv.grafanaConfig
                    })
                    setConfigModalVisible(true)
                  }}
                  disabled={game.status === 'offline'}
                  title={game.status === 'offline' ? '已下线，无法配置' : '配置'}
                >配置</Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    )
  }



  return (
    <>
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 480 }}>
        <Title level={4} style={{ margin: 0 }}>
          游戏管理
        </Title>
          {/* 统计概览（按需隐藏） */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* 搜索 */}
          <Input.Search
            placeholder="搜索 appid"
            allowClear
            onSearch={(v) => { setKeyword(v); setCurrentPage(1) }}
            onChange={(e) => { if (!e.target.value) { setKeyword(''); setCurrentPage(1) } }}
            style={{ width: 240 }}
          />
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          添加游戏
        </Button>
        </div>
      </div>
      
      {/* 游戏列表 */}
      <div style={{ marginBottom: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div style={{ marginTop: 8, color: '#666' }}>加载中...</div>
          </div>
        ) : gameList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
            暂无游戏数据，点击&ldquo;添加游戏&rdquo;开始使用
          </div>
        ) : (
          (() => {
            // 过滤
            const filtered = gameList.filter(g => g.appId.toLowerCase().includes(keyword.toLowerCase()))
            // 默认创建时间倒序
            const sorted = [...filtered].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
            // 分页
            const start = (currentPage - 1) * pageSize
            const pageItems = sorted.slice(start, start + pageSize)

            return (
          <div>
                {pageItems.map(game => renderGameCard(game))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div style={{ color: '#999', fontSize: 14 }}>共 {sorted.length} 个游戏</div>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={sorted.length}
                    showSizeChanger
                    pageSizeOptions={[5, 10, 20] as unknown as number[]}
                    onChange={(p, ps) => { setCurrentPage(p); setPageSize(ps) }}
                    showTotal={(total) => `共 ${total} 条`}
                  />
            </div>
          </div>
            )
          })()
        )}
      </div>

      {/* 添加游戏弹窗 */}
      <Modal
        title="添加游戏"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(vals) => {
            handleAddGame(vals as AddGameFormValues)
          }}
          onFinishFailed={() => message.error('请检查表单必填项')}
          initialValues={{
            clientResource: true,
            serverResource: false,
            globalAcceleration: false,
            flashLaunch: false,
            grafanaConfig: false
          }}
        >
          <Form.Item
            label="APP ID"
            name="appId"
            rules={[
              { required: true, message: 'APP ID不能为空' }
              ,
              // 唯一性校验：避免与现有 appId 重复
              {
                validator: async (_rule, value) => {
                  if (!value) return Promise.resolve()
                  const exists = gameList.some(g => g.appId === value)
                  if (exists) return Promise.reject(new Error('该APP ID已存在，请重新输入'))
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input placeholder="请输入appid" allowClear />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="description"
          >
            <Input placeholder="请输入游戏描述" />
          </Form.Item>

          <Form.Item
            label="客户端资源"
            name="clientResource"
            valuePropName="checked"
            extra="开启后显示'已配置'"
            dependencies={['serverResource']}
            rules={[
              {
                validator: async (_rule, value, callback) => {
                  const server = form.getFieldValue('serverResource') as boolean
                  if (!value && !server) {
                    return Promise.reject(new Error('请至少选择客户端或服务端资源'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="服务端资源"
            name="serverResource"
            valuePropName="checked"
            extra="开启后显示'已配置'"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="全球加速"
            name="globalAcceleration"
            valuePropName="checked"
            extra="启用全球加速"
            dependencies={['clientResource']}
            rules={[
              {
                validator: async (_rule, value) => {
                  const client = form.getFieldValue('clientResource') as boolean
                  if (value && !client) {
                    return Promise.reject(new Error('未配置客户端资源，无法开启全球加速'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="FlashLaunch"
            name="flashLaunch"
            valuePropName="checked"
            extra="启用flashlaunch"
            dependencies={['clientResource']}
            rules={[
              {
                validator: async (_rule, value) => {
                  const client = form.getFieldValue('clientResource') as boolean
                  if (value && !client) {
                    return Promise.reject(new Error('未配置客户端资源，无法开启FlashLaunch'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="Grafana配置"
            name="grafanaConfig"
            valuePropName="checked"
            extra="启用Grafana监控"
            dependencies={['clientResource']}
            rules={[
              {
                validator: async (_rule, value) => {
                  const client = form.getFieldValue('clientResource') as boolean
                  if (value && !client) {
                    return Promise.reject(new Error('未配置客户端资源，无法开启Grafana配置'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Switch />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" onClick={() => form.submit()}>
                确认
              </Button>
              <Button onClick={() => {
                setAddModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 下线确认弹窗 */}
      <Modal
        title="确认下线"
        open={offlineConfirmVisible}
        onCancel={() => { setOfflineConfirmVisible(false); setOfflineTargetGame(null); setOfflineAcknowledge(false) }}
        onOk={() => {
          if (!offlineTargetGame) return
          if (!offlineAcknowledge) { message.warning('请勾选“我已知悉风险”'); return }
          // 标记为下线中，并初始化日志
          setGameList(prev => prev.map(g => g.id === offlineTargetGame.id ? {
            ...g,
            status: 'offlining',
            offlineLogs: [
              { time: new Date().toLocaleString('zh-CN'), step: '开始下线', status: 'running' as const },
              { time: new Date().toLocaleString('zh-CN'), step: '清理云资源任务队列', status: 'running' as const },
            ]
          } : g))
          setOfflineConfirmVisible(false)
          setOfflineLogsVisible(true)
          // 模拟异步清理流程
          simulateOfflining(offlineTargetGame.id)
        }}
        okText="确认下线"
        okButtonProps={{ danger: true, disabled: !offlineAcknowledge }}
        cancelText="取消"
      >
        <div style={{ marginBottom: 12, color: '#8c4a00', background: '#fff7e6', border: '1px solid #ffd591', padding: 12, borderRadius: 6 }}>
          下线将清理所有关联资源，过程不可取消且不可恢复，请谨慎操作。
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={offlineAcknowledge} onChange={(e) => setOfflineAcknowledge(e.target.checked)} />
          我已知悉风险
        </label>
      </Modal>

      {/* 下线日志弹窗 */}
      <Modal
        title={`下线日志${offlineTargetGame ? ` - ${offlineTargetGame.appId}` : ''}`}
        open={offlineLogsVisible}
        onCancel={() => setOfflineLogsVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ maxHeight: 360, overflow: 'auto', paddingRight: 4 }}>
          {(gameList.find(g => g.id === offlineTargetGame?.id)?.offlineLogs || []).map((log, idx) => {
            const canRetry = log.status === 'failed' && (gameList.find(g => g.id === offlineTargetGame?.id)?.status === 'offlining')
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#999', width: 168 }}>{log.time}</span>
                <span style={{ flex: 1, marginLeft: 12 }}>{log.step}</span>
                <span style={{ color: log.status === 'success' ? '#52c41a' : log.status === 'failed' ? '#ff4d4f' : log.status === 'running' ? '#1677ff' : '#999', marginRight: 12 }}>
                  {log.status}
                </span>
                {canRetry && (
                  <Button size="small" type="link" onClick={() => retryOfflineStep(idx)}>
                    重试
                  </Button>
                )}
              </div>
            )
          })}
          {!(gameList.find(g => g.id === offlineTargetGame?.id)?.offlineLogs || []).length && <div style={{ color: '#999' }}>暂无日志</div>}
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="删除确认"
        open={!!deleteConfirmGame}
        onCancel={() => setDeleteConfirmGame(null)}
        onOk={() => {
          if (deleteConfirmGame) {
            setGameList(gameList.filter(item => item.id !== deleteConfirmGame.id))
            message.success('游戏删除成功')
          }
          setDeleteConfirmGame(null)
        }}
        okText="确定"
        okButtonProps={{ danger: true }}
        cancelText="关闭"
      >
        删除后数据不可恢复，是否删除该游戏（{deleteConfirmGame?.appId}）？
      </Modal>

      {/* 初始化确认弹窗 */}
      <Modal
        title="初始化配置"
        open={confirmModalVisible}
        onCancel={() => {
          setConfirmModalVisible(false)
          setInitConfirmed(false)
          setCurrentGameData(null)
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: '6px'
          }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                一旦初始化完成，以下信息<strong style={{ color: '#ff4d4f' }}>不可修改</strong>：
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
                <li>APP ID</li>
                <li>客户端资源</li>
                <li>服务端资源</li>
                <li>全球加速</li>
                <li>flashlaunch</li>
              </ul>
            </div>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
            checked={initConfirmed}
            onChange={(e) => setInitConfirmed(e.target.checked)}
            />
            我已知晓并确认
          </label>
        </div>

        <Space>
          <Button 
            type="primary" 
            danger
            disabled={!initConfirmed}
            onClick={handleInitConfirm}
          >
            确定开启
          </Button>
          <Button onClick={() => {
            setConfirmModalVisible(false)
            setInitConfirmed(false)
            setCurrentGameData(null)
          }}>
            取消
          </Button>
        </Space>
      </Modal>

      {/* 资源配置确认弹窗 */}
      <Modal
        title={resourceConfirmData?.title || ''}
        open={resourceConfirmVisible}
        onOk={handleResourceConfirm}
        onCancel={() => {
          setResourceConfirmVisible(false)
          setResourceConfirmData(null)
        }}
        okText="确认"
        cancelText="取消"
      >
        <p>{resourceConfirmData?.content || ''}</p>
      </Modal>

      {/* 初始化确认弹窗 */}
      <Modal
        title="初始化配置确认"
        open={initConfirmVisible}
        onOk={handleConfirmInitialization}
        onCancel={() => {
          setInitConfirmVisible(false)
          setInitConfirmData(null)
        }}
        okText="开始初始化"
        cancelText="取消"
        width={550}
      >
        {initConfirmData && (
          <div>
            <div style={{ marginBottom: 16 }}>
              游戏：<strong style={{ color: '#1890ff' }}>{initConfirmData.game.appId}</strong>
              <br />
              环境：<strong style={{ color: '#52c41a' }}>
                {initConfirmData.environment === 'testEnv' ? '测试环境' : '生产环境'}
              </strong>
            </div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>
              将要初始化以下 {initConfirmData.configs.length} 项配置：
            </div>
            <div style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12, marginBottom: 16 }}>
              {initConfirmData.configs.map((config, index) => (
                <div key={config.name} style={{ marginBottom: index < initConfirmData.configs.length - 1 ? 8 : 0 }}>
                  <div style={{ color: '#52c41a', fontWeight: 500, fontSize: '14px' }}>
                    ✓ {config.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', marginLeft: 16 }}>
                    {config.desc}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, backgroundColor: '#fff2e8', border: '1px solid #ffd591', borderRadius: 6, fontSize: '13px' }}>
              <div style={{ color: '#d46b08', fontWeight: 500, marginBottom: 4 }}>
                ⚠️ 重要提醒
              </div>
              <div style={{ color: '#8c4a00' }}>
                初始化完成后，已选择的配置项将<strong>不可修改</strong>，请确认配置无误后再继续。
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 初始化进度弹窗 */}
      <Modal
        title="初始化进度"
        open={initProgressVisible}
        footer={null}
        closable={false}
        maskClosable={false}
        width={600}
      >
        {initProgressData && (
          <div>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                {initProgressData.gameName}
              </Title>
              <div style={{ color: '#666', fontSize: '14px', marginTop: 4 }}>
                正在初始化游戏配置...
              </div>
            </div>

            {/* 总体进度 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>总体进度</span>
                <span style={{ color: '#1890ff' }}>
                  {initProgressData.currentStep} / {initProgressData.totalSteps}
                </span>
              </div>
              <Progress 
                percent={Math.round((initProgressData.currentStep / initProgressData.totalSteps) * 100)}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>

            {/* 详细步骤 */}
            <div>
              <div style={{ fontWeight: 500, marginBottom: 12 }}>初始化步骤</div>
              {initProgressData.configs.map((config) => (
                <div 
                  key={config.name} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px',
                    marginBottom: 8,
                    backgroundColor: config.status === 'running' ? '#f6ffed' : '#fafafa',
                    border: `1px solid ${
                      config.status === 'completed' ? '#b7eb8f' :
                      config.status === 'running' ? '#52c41a' :
                      config.status === 'failed' ? '#ff7875' : '#d9d9d9'
                    }`,
                    borderRadius: 6
                  }}
                >
                  <div style={{ marginRight: 12 }}>
                    {config.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
                    {config.status === 'running' && <SyncOutlined spin style={{ color: '#1890ff', fontSize: 16 }} />}
                    {config.status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
                    {config.status === 'pending' && <div style={{ width: 16, height: 16, border: '2px solid #d9d9d9', borderRadius: '50%' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{config.name}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{config.desc}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {config.status === 'completed' && '已完成'}
                    {config.status === 'running' && '进行中...'}
                    {config.status === 'failed' && '失败'}
                    {config.status === 'pending' && '等待中'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </Card>
    {/* 配置弹窗：以列表字段（表单）形式交互 */}
    <Modal
      title={configModalGame ? `配置 - ${configModalGame.appId}（${configModalEnv === 'testEnv' ? '测试环境' : configModalEnv === 'prodEnv' ? '生产环境' : ''}）` : '配置'}
      open={configModalVisible}
      onCancel={() => { setConfigModalVisible(false); setConfigModalGame(null); setConfigModalEnv(null) }}
      onOk={() => {
        // 使用表单校验，错误在对应表单项下方提示
        configForm
          .validateFields()
          .then((values) => {
            if (configModalGame && configModalEnv) {
              setGameList(prev => prev.map(g => {
                if (g.id !== configModalGame.id) return g
                const next = { ...g }
                next[configModalEnv] = { ...next[configModalEnv], ...values }
                return next
              }))
              message.success('配置已保存')
            }
            setConfigModalVisible(false)
            setConfigModalGame(null)
            setConfigModalEnv(null)
          })
          .catch(() => {
            // 校验不通过时，由 Form.Item 展示错误
          })
      }}
      width={520}
    >
     
      <Form form={configForm} layout="vertical">
        <Form.Item label="客户端资源" name="clientResource" valuePropName="checked">
          <Switch disabled={clientResourceLocked} />
        </Form.Item>
        <Form.Item label="服务端资源" name="serverResource" valuePropName="checked">
          <Switch disabled={serverResourceLocked} />
        </Form.Item>
        <Form.Item 
          label="全球加速" 
          name="globalAcceleration" 
          valuePropName="checked" 
          extra={globalAccelInitTip ? '游戏已初始化，全球加速一旦开启不可关闭' : undefined}
          dependencies={['clientResource']}
          validateTrigger="onChange"
          rules={[
            {
              validator: async (_rule, value) => {
                const client = configForm.getFieldValue('clientResource') as boolean
                if (value && !client) {
                  return Promise.reject(new Error('未配置客户端资源，无法开启全球加速'))
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Switch disabled={globalAccelLocked} />
        </Form.Item>
        <Form.Item 
          label="FlashLaunch" 
          name="flashLaunch" 
          valuePropName="checked"
          extra={flashLaunchInitTip ? '游戏已初始化，FlashLaunch一旦开启不可关闭' : undefined}
          dependencies={['clientResource']}
          validateTrigger="onChange"
          rules={[
            {
              validator: async (_rule, value) => {
                const client = configForm.getFieldValue('clientResource') as boolean
                if (value && !client) {
                  return Promise.reject(new Error('未配置客户端资源，无法开启FlashLaunch'))
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Switch disabled={flashLaunchLocked} />
        </Form.Item>
        <Form.Item 
          label="Grafana配置" 
          name="grafanaConfig" 
          valuePropName="checked" 
          extra={grafanaInitTip ? '游戏已初始化，Grafana配置一旦开启不可关闭' : undefined}
          dependencies={['clientResource']}
          validateTrigger="onChange"
          rules={[
            {
              validator: async (_rule, value) => {
                const client = configForm.getFieldValue('clientResource') as boolean
                if (value && !client) {
                  return Promise.reject(new Error('未配置客户端资源，无法开启Grafana配置'))
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Switch disabled={grafanaLocked} />
        </Form.Item>
      </Form>
    </Modal>
    </>
  )
}