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
  Checkbox,
  Tag,
  Tooltip,
  Progress,
  Row,
  Col,
  Badge
} from 'antd'
import { 
  PlusOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,

  DownOutlined,
  UpOutlined
} from '@ant-design/icons'

const { Title } = Typography

// 环境配置类型定义
interface EnvironmentConfig {
  clientResource: boolean
  serverResource: boolean
  globalAcceleration: boolean
  flashLaunch: boolean
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
      flashLaunch: true,
      initStatus: 'completed'
    },
    prodEnv: {
      clientResource: true,
      serverResource: false,
      globalAcceleration: true,
      flashLaunch: false,
      initStatus: 'not_initialized'
    },
    createTime: '2024-01-15 10:30:00'
  },
  {
    id: 'game-002',
    appId: 'testgame',
    description: '测试游戏',
    testEnv: {
      clientResource: false,
      serverResource: true,
      globalAcceleration: false,
      flashLaunch: true,
      initStatus: 'not_initialized'
    },
    prodEnv: {
      clientResource: true,
      serverResource: true,
      globalAcceleration: false,
      flashLaunch: false,
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
      globalAcceleration: true,
      flashLaunch: true,
      initStatus: 'completed'
    },
    prodEnv: {
      clientResource: false,
      serverResource: false,
      globalAcceleration: false,
      flashLaunch: false,
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
  const [initializingGames, setInitializingGames] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [form] = Form.useForm()

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

  // 切换卡片展开状态
  const toggleCardExpanded = (gameId: string): void => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
      }
      return newSet
    })
  }

  // 删除游戏
  const handleDeleteGame = (game: Game): void => {
    // 已初始化的游戏不能删除
    if (game.testEnv.initStatus === 'completed' || game.prodEnv.initStatus === 'completed') {
      message.warning('已有环境完成初始化的游戏不能删除')
      return
    }

    Modal.confirm({
      title: '删除确认',
      content: '删除后数据不可恢复，是否删除？',
      okText: '确定',
      okType: 'danger',
      cancelText: '关闭',
      onOk: () => {
        setGameList(gameList.filter(item => item.id !== game.id))
        message.success('游戏删除成功')
      }
    })
  }

  // 切换资源状态
  const handleToggleResource = (
    gameId: string, 
    environment: 'testEnv' | 'prodEnv',
    resourceType: keyof Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch'>, 
    checked: boolean
  ): void => {
    const game = gameList.find(g => g.id === gameId)
    if (!game) return

    const envConfig = game[environment]
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    const resourceNames = {
      clientResource: '客户端资源',
      serverResource: '服务端资源',
      globalAcceleration: '全球加速',
      flashLaunch: 'FlashLaunch'
    }

    // 已初始化的游戏，客户端和服务端资源不可修改
    if (envConfig.initStatus === 'completed' && (resourceType === 'clientResource' || resourceType === 'serverResource')) {
      message.warning(`${envName}已完成初始化，不可修改`)
      return
    }

    // 全球加速特殊逻辑
    if (resourceType === 'globalAcceleration') {
      if (checked) {
        // 检查是否配置了客户端资源
        if (!envConfig.clientResource) {
          message.warning(`${envName}未配置客户端资源，无法开启`)
          return
        }
        // 开启全球加速需要确认
        showResourceConfirm(
          gameId,
          environment,
          resourceType,
          checked,
          `开启${envName}全球加速`,
          `开启后无法关闭，是否确认开启${envName}的全球加速？`
        )
        return
      } else {
        // 尝试关闭全球加速时，提示无法关闭
        message.warning('开启后无法关闭')
        return
      }
    }

    // FlashLaunch 特殊逻辑 - 任何时候都可以修改，但需要确认
    if (resourceType === 'flashLaunch') {
      showResourceConfirm(
        gameId,
        environment,
        resourceType,
        checked,
        `${checked ? '开启' : '关闭'}${envName}FlashLaunch`,
        `是否确认${checked ? '开启' : '关闭'}${envName}的FlashLaunch？`
      )
      return
    }

    // 客户端和服务端资源未初始化时需要确认
    if ((resourceType === 'clientResource' || resourceType === 'serverResource') && envConfig.initStatus === 'not_initialized') {
      showResourceConfirm(
        gameId,
        environment,
        resourceType,
        checked,
        `${checked ? '开启' : '关闭'}${envName}${resourceNames[resourceType]}`,
        `是否确认${checked ? '开启' : '关闭'}${envName}的${resourceNames[resourceType]}？`
      )
      return
    }

    // 其他情况直接更新
    updateGameResource(gameId, environment, resourceType, checked)
    message.success(`${envName}${resourceNames[resourceType]}已${checked ? '开启' : '关闭'}`)
  }

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
  const showResourceConfirm = (
    gameId: string, 
    environment: 'testEnv' | 'prodEnv',
    resourceType: keyof Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch'>, 
    checked: boolean, 
    title: string, 
    content: string
  ): void => {
    setResourceConfirmData({
      gameId,
      environment,
      resourceType,
      checked,
      title,
      content
    })
    setResourceConfirmVisible(true)
  }

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
    
    // 添加到初始化中的游戏列表
    setInitializingGames(prev => new Set(prev).add(gameEnvId))
    
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
    const gameEnvId = `${gameId}-${environment}`
    
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
    
    // 从初始化中列表移除
    setInitializingGames(prev => {
      const newSet = new Set(prev)
      newSet.delete(gameEnvId)
      return newSet
    })
    
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
    const gameEnvId = `${gameId}-${environment}`
    
    setInitializingGames(prev => {
      const newSet = new Set(prev)
      newSet.delete(gameEnvId)
      return newSet
    })
    
    message.error(`${envName}初始化失败，请稍后重试`)
    
    // 3秒后关闭进度弹窗
    setTimeout(() => {
      setInitProgressVisible(false)
      setInitProgressData(null)
    }, 3000)
  }



  // 表单提交处理
  const handleAddGame = async (values: { 
    appId: string; 
    appName: string; 
    clientResource: boolean; 
    serverResource: boolean;
    globalAcceleration: boolean;
    flashLaunch: boolean;
  }): Promise<void> => {
    // 前端校验
    if (!values.appId) {
      message.error('APP ID不能为空')
      return
    }

    // 检查APP ID是否已存在
    const existingGame = gameList.find(game => game.appId === values.appId)
    if (existingGame) {
      message.error('该APP ID已存在，请重新输入')
      return
    }

    // 检查是否至少开启了客户端或服务端资源
    if (!values.clientResource && !values.serverResource) {
      message.error('服务端和客户端资源至少配置一项')
      return
    }

    // 检查依赖关系：未配置客户端资源时不能开启全球加速和flashlaunch
    if (!values.clientResource) {
      if (values.globalAcceleration) {
        message.error('未配置客户端资源，无法开启全球加速')
        return
      }
      if (values.flashLaunch) {
        message.error('未配置客户端资源，无法开启FlashLaunch')
        return
      }
    }

    // 创建新游戏对象并显示初始化确认弹窗
    const newGame: Game = {
      id: `game-${Date.now()}`,
      appId: values.appId,
      description: values.appName || '新添加的游戏',
      testEnv: {
        initStatus: 'not_initialized' as const,
        clientResource: values.clientResource,
        serverResource: values.serverResource,
        globalAcceleration: values.globalAcceleration,
        flashLaunch: values.flashLaunch
      },
      prodEnv: {
        initStatus: 'not_initialized' as const,
        clientResource: false,
        serverResource: false,
        globalAcceleration: false,
        flashLaunch: false
      },
      createTime: new Date().toLocaleString('zh-CN')
    }
    setCurrentGameData(newGame)
    setAddModalVisible(false)
    setConfirmModalVisible(true)
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
            initStatus: 'not_initialized'
          },
          prodEnv: {
            clientResource: false,
            serverResource: false,
            globalAcceleration: false,
            flashLaunch: false,
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

  // 渲染环境配置卡片
  const renderEnvironmentCard = (game: Game, environment: 'testEnv' | 'prodEnv') => {
    const envConfig = game[environment]
    const envName = environment === 'testEnv' ? '测试环境' : '生产环境'
    const envColor = environment === 'testEnv' ? '#1890ff' : '#52c41a'
    const testInitializing = initializingGames.has(`${game.id}-testEnv`)
    const prodInitializing = initializingGames.has(`${game.id}-prodEnv`)
    const isInitializing = environment === 'testEnv' ? testInitializing : prodInitializing

    const resources = [
      { key: 'clientResource', name: '客户端资源', icon: '🖥️' },
      { key: 'serverResource', name: '服务端资源', icon: '⚙️' },
      { key: 'globalAcceleration', name: '全球加速', icon: '🌍' },
      { key: 'flashLaunch', name: 'FlashLaunch', icon: '⚡' }
    ]

    const enabledCount = resources.filter(r => envConfig[r.key as keyof EnvironmentConfig]).length

    return (
      <Card
        size="small"
        style={{ 
          marginBottom: 12,
          borderLeft: `3px solid ${envColor}`,
          backgroundColor: envConfig.initStatus === 'completed' ? '#f6ffed' : '#fafafa'
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 500, color: envColor, fontSize: '14px' }}>
              {envName}
            </div>
            <Tag color={envConfig.initStatus === 'completed' ? 'success' : 'warning'}>
              {envConfig.initStatus === 'completed' ? '已初始化' : '未初始化'}
            </Tag>
            <Badge count={enabledCount} showZero style={{ backgroundColor: '#52c41a' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>已配置</span>
            </Badge>
          </div>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {envConfig.initStatus === 'not_initialized' && (
              <Button
                size="small"
                type="primary"
                icon={isInitializing ? <LoadingOutlined /> : <PlayCircleOutlined />}
                onClick={() => handleInitializeGame(game, environment)}
                loading={isInitializing}
                disabled={isInitializing}
                style={{ backgroundColor: envColor, borderColor: envColor }}
              >
                {isInitializing ? '初始化中' : '初始化'}
              </Button>
            )}
          </div>
        </div>

        {/* 资源配置详情 */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {resources.map(resource => {
            const isEnabled = envConfig[resource.key as keyof EnvironmentConfig] as boolean
            const isDisabled = envConfig.initStatus === 'completed' && 
                              (resource.key === 'clientResource' || resource.key === 'serverResource')
            
            let tooltip = ''
            if (isDisabled) {
              tooltip = '已完成初始化，不可修改'
            } else if (resource.key === 'globalAcceleration' && envConfig.globalAcceleration) {
              tooltip = '开启后无法关闭'
            }
            
            const switchDisabled = isDisabled || 
                                  (resource.key === 'globalAcceleration' && envConfig.globalAcceleration)

            return (
              <div
                key={resource.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  backgroundColor: isEnabled ? '#e6f7ff' : '#f5f5f5',
                  borderRadius: 4,
                  border: `1px solid ${isEnabled ? '#91d5ff' : '#d9d9d9'}`,
                  fontSize: '12px'
                }}
              >
                <span>{resource.icon}</span>
                <span style={{ color: isEnabled ? '#1890ff' : '#666' }}>
                  {resource.name}
                </span>
                <Tooltip title={tooltip}>
                  <Switch
                    checked={isEnabled}
                    onChange={(checked) => handleToggleResource(game.id, environment, resource.key as keyof Pick<EnvironmentConfig, 'clientResource' | 'serverResource' | 'globalAcceleration' | 'flashLaunch'>, checked)}
                    size="small"
                    disabled={switchDisabled}
                  />
                </Tooltip>
              </div>
            )
          })}
        </div>
      </Card>
    )
  }

  // 渲染游戏卡片
  const renderGameCard = (game: Game) => {
    const isExpanded = expandedCards.has(game.id)
    const testCompleted = game.testEnv.initStatus === 'completed'
    const prodCompleted = game.prodEnv.initStatus === 'completed'
    const totalResources = [
      game.testEnv.clientResource, game.testEnv.serverResource, game.testEnv.globalAcceleration, game.testEnv.flashLaunch,
      game.prodEnv.clientResource, game.prodEnv.serverResource, game.prodEnv.globalAcceleration, game.prodEnv.flashLaunch
    ].filter(Boolean).length

    return (
      <Card
        key={game.id}
        style={{ 
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0'
        }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        {/* 卡片头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Title level={4} style={{ margin: 0, fontSize: '18px', color: '#1890ff' }}>
                {game.appId}
              </Title>
              <Badge count={totalResources} showZero style={{ backgroundColor: '#52c41a' }}>
                <span style={{ fontSize: '12px', color: '#999' }}>配置项</span>
              </Badge>
            </div>
            {game.description && (
              <div style={{ color: '#666', fontSize: '14px', marginBottom: 8 }}>
                {game.description}
              </div>
            )}
            <div style={{ color: '#999', fontSize: '12px' }}>
              创建时间：{game.createTime}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => toggleCardExpanded(game.id)}
              style={{ color: '#666' }}
            >
              {isExpanded ? '收起' : '展开配置'}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGame(game)}
              disabled={testCompleted || prodCompleted}
              title={(testCompleted || prodCompleted) ? '已有环境完成初始化的游戏不能删除' : '删除游戏'}
            >
              删除
            </Button>
          </div>
        </div>

        {/* 环境状态概览 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: isExpanded ? 20 : 0 }}>
          <div style={{ 
            flex: 1, 
            padding: '12px 16px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: 6,
            border: '1px solid #bae7ff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: '#1890ff' }}>测试环境</span>
              <Tag color={testCompleted ? 'success' : 'warning'}>
                {testCompleted ? '已初始化' : '未初始化'}
              </Tag>
            </div>
          </div>
          <div style={{ 
            flex: 1, 
            padding: '12px 16px', 
            backgroundColor: '#f6ffed', 
            borderRadius: 6,
            border: '1px solid #b7eb8f'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: '#52c41a' }}>生产环境</span>
              <Tag color={prodCompleted ? 'success' : 'warning'}>
                {prodCompleted ? '已初始化' : '未初始化'}
              </Tag>
            </div>
          </div>
        </div>

        {/* 详细配置（展开时显示） */}
        {isExpanded && (
          <div style={{ paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
            <Row gutter={16}>
              <Col span={12}>
                {renderEnvironmentCard(game, 'testEnv')}
              </Col>
              <Col span={12}>
                {renderEnvironmentCard(game, 'prodEnv')}
              </Col>
            </Row>
          </div>
        )}
      </Card>
    )
  }



  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          游戏管理
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          添加游戏
        </Button>
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
          <div>
            {gameList.map(game => renderGameCard(game))}
            <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
              共 {gameList.length} 个游戏
            </div>
          </div>
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
          onFinish={handleAddGame}
        >
          <Form.Item
            label="APP ID"
            name="appId"
            rules={[
              { required: true, message: 'APP ID不能为空' }
            ]}
          >
            <Input placeholder="请输入appid" />
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
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="FlashLaunch"
            name="flashLaunch"
            valuePropName="checked"
            extra="启用flashlaunch"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
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

          <Checkbox 
            checked={initConfirmed}
            onChange={(e) => setInitConfirmed(e.target.checked)}
          >
            我已知晓并确认
          </Checkbox>
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
  )
}