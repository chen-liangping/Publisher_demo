'use client'

import React, { useState } from 'react'
import { 
  Card, 
  Button, 
  Modal,
  Progress,
  Typography,
  Space,
  message,
  Radio
} from 'antd'
import { 
  PlayCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  LoadingOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

type ServerDeployType = 'vm' | 'container'

interface InitConfig {
  name: string
  desc: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

interface InitProgressData {
  type: 'client' | 'server'
  title: string
  configs: InitConfig[]
  currentStep: number
  totalSteps: number
  serverDeployType?: ServerDeployType
}

export default function TestInitialization() {
  const [initProgressVisible, setInitProgressVisible] = useState<boolean>(false)
  const [initProgressData, setInitProgressData] = useState<InitProgressData | null>(null)
  const [clientInitializing, setClientInitializing] = useState<boolean>(false)
  const [serverInitializing, setServerInitializing] = useState<boolean>(false)
  const [clientCompleted, setClientCompleted] = useState<boolean>(false)
  const [serverCompleted, setServerCompleted] = useState<boolean>(false)

  // 服务端初始化前置：选择部署方式（默认虚机，避免空选择导致错误状态）
  const [serverDeployType, setServerDeployType] = useState<ServerDeployType>('vm')

  // 模拟检查游戏配置
  const checkGameConfigs = (type: 'client' | 'server', deployType?: ServerDeployType) => {
    // 这里模拟从游戏管理中获取配置
    // 实际项目中应该从全局状态或API获取
    const mockConfigs = {
      client: [
        { name: 'S3存储配置', desc: 'Amazon S3 存储桶初始化' },
        { name: 'CDN加速配置', desc: 'CloudFront CDN 节点配置' }
      ],
      server:
        deployType === 'container'
          ? [
              { name: 'K8S集群配置', desc: 'Kubernetes 集群初始化' },
              { name: '服务部署配置', desc: '应用服务部署配置' }
            ]
          : [
              { name: '虚机集群配置', desc: '虚拟机集群资源初始化' },
              { name: '服务部署配置', desc: '应用服务部署配置' }
            ]
    }

    // 模拟有配置的情况（80%概率有配置）
    return Math.random() > 0.2 ? mockConfigs[type] : []
  }

  // 开始初始化
  const handleInitialization = (type: 'client' | 'server', deployType?: ServerDeployType) => {
    const configs = checkGameConfigs(type, deployType)
    
    if (configs.length === 0) {
      Modal.warning({
        title: '无相应配置项',
        content: '无相应配置项，请联系平台SRE配置',
        okText: '确定'
      })
      return
    }

    const title = type === 'client' ? '客户端初始化' : '服务端初始化'
    const progressConfigs = configs.map(config => ({
      ...config,
      status: 'pending' as const
    }))

    setInitProgressData({
      type,
      title,
      configs: progressConfigs,
      currentStep: 0,
      totalSteps: configs.length,
      serverDeployType: type === 'server' ? (deployType ?? 'vm') : undefined
    })
    setInitProgressVisible(true)

    // 设置对应的初始化状态
    if (type === 'client') {
      setClientInitializing(true)
    } else {
      setServerInitializing(true)
    }

    // 开始执行初始化步骤
    executeInitializationSteps(type, progressConfigs, 0)
  }

  // 执行初始化步骤
  const executeInitializationSteps = (
    type: 'client' | 'server',
    configs: InitConfig[], 
    currentIndex: number
  ): void => {
    if (currentIndex >= configs.length) {
      // 所有步骤完成
      completeInitialization(type)
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
          executeInitializationSteps(type, updatedConfigs, currentIndex + 1)
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
          handleInitializationFailure(type)
        }, 1000)
      }
    }, stepDuration)
  }

  // 完成初始化
  const completeInitialization = (type: 'client' | 'server'): void => {
    // 清除初始化状态，设置完成状态
    if (type === 'client') {
      setClientInitializing(false)
      setClientCompleted(true)
    } else {
      setServerInitializing(false)
      setServerCompleted(true)
    }
    
    message.success(`${type === 'client' ? '客户端' : '服务端'}初始化成功！`)
    
    // 2秒后关闭进度弹窗
    setTimeout(() => {
      setInitProgressVisible(false)
      setInitProgressData(null)
    }, 2000)
  }

  // 处理初始化失败
  const handleInitializationFailure = (type: 'client' | 'server'): void => {
    // 清除初始化状态
    if (type === 'client') {
      setClientInitializing(false)
    } else {
      setServerInitializing(false)
    }
    
    message.error(`${type === 'client' ? '客户端' : '服务端'}初始化失败，请稍后重试`)
    
    // 3秒后关闭进度弹窗
    setTimeout(() => {
      setInitProgressVisible(false)
      setInitProgressData(null)
    }, 3000)
  }

  // 注意：Next.js 会把 public/ 作为静态资源根目录
  // 你当前的背景图在 public/assets/ 下，因此 url 需要以 /assets/ 开头
  const clientInitBgUrl = '/assets/init-client-bg.jpg'
  const serverInitBgUrl = '/assets/init-server-bg.jpg'

  const initCardBodyStyle = (bgUrl: string) => ({
    minHeight: 480,
    padding: 0,
    borderRadius: 8,
    // 背景图本体：初始化完成后展示 100% 透明度（无遮罩）
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden' as const,
    position: 'relative' as const
  })

  // 遮罩层：用于保证未完成时文字可读；完成后透明度降为 0，露出完整背景图
  const initCardOverlayStyle = (isCompleted: boolean) => ({
    position: 'absolute' as const,
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.90) 20%, rgba(255,255,255,0.84) 80%, rgba(255,255,255,0.90) 100%)',
    opacity: isCompleted ? 0 : 1,
    transition: 'opacity 0.35s ease'
  })

  const initCardContentStyle = {
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    padding: '40px 20px'
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        测试初始化
      </Title>
      
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 客户端初始化卡片（上下布局） */}
        <Card
          title="客户端初始化"
          actions={[
            <Button
              key="init"
              type={clientCompleted ? "default" : "primary"}
              icon={
                clientCompleted ? <CheckCircleOutlined /> :
                clientInitializing ? <LoadingOutlined /> : 
                <PlayCircleOutlined />
              }
              onClick={() => handleInitialization('client')}
              loading={clientInitializing}
              disabled={clientInitializing || clientCompleted}
              size="large"
            >
              {clientCompleted ? '已完成' : clientInitializing ? '初始化中...' : '开始初始化'}
            </Button>
          ]}
          bodyStyle={{ padding: 0 }}
        >
          <div style={initCardBodyStyle(clientInitBgUrl)}>
            <div style={initCardOverlayStyle(clientCompleted)} />
            <div style={initCardContentStyle}>
            <div style={{ 
              fontSize: '48px', 
              color: clientCompleted ? '#52c41a' : clientInitializing ? '#1890ff' : '#d9d9d9',
              marginBottom: 16,
              transition: 'color 0.3s'
            }}>
              {clientCompleted ? <CheckCircleOutlined /> :
               clientInitializing ? <SyncOutlined spin /> : 
               <PlayCircleOutlined />}
            </div>
            <Text style={{ 
              fontSize: '16px', 
              color: clientCompleted ? '#52c41a' : '#666',
              fontWeight: clientCompleted ? 500 : 'normal'
            }}>
              {clientCompleted ? '初始化完成' : '客户端资源尚未初始化'}
            </Text>
            <br />
            <Text style={{ fontSize: '14px', color: '#999' }}>
              {clientCompleted ? <>客户端资源已准备就绪</> : '请点击初始化按钮执行操作'}
            </Text>
            </div>
          </div>
        </Card>

        {/* 服务端初始化卡片（上下布局） */}
        <Card
          title="服务端初始化"
          actions={[
            <Button
              key="init"
              type={serverCompleted ? "default" : "primary"}
              icon={
                serverCompleted ? <CheckCircleOutlined /> :
                serverInitializing ? <LoadingOutlined /> : 
                <PlayCircleOutlined />
              }
              onClick={() => handleInitialization('server', serverDeployType)}
              loading={serverInitializing}
              disabled={serverInitializing || serverCompleted}
              size="large"
            >
              {serverCompleted ? '已完成' : serverInitializing ? '初始化中...' : '确认初始化'}
            </Button>
          ]}
          bodyStyle={{ padding: 0 }}
        >
          <div style={initCardBodyStyle(serverInitBgUrl)}>
            <div style={initCardOverlayStyle(serverCompleted)} />
            <div style={initCardContentStyle}>
            <div style={{ 
              fontSize: '48px', 
              color: serverCompleted ? '#52c41a' : serverInitializing ? '#1890ff' : '#d9d9d9',
              marginBottom: 16,
              transition: 'color 0.3s'
            }}>
              {serverCompleted ? <CheckCircleOutlined /> :
               serverInitializing ? <SyncOutlined spin /> : 
               <PlayCircleOutlined />}
            </div>
            <Text style={{ 
              fontSize: '16px', 
              color: serverCompleted ? '#52c41a' : '#666',
              fontWeight: serverCompleted ? 500 : 'normal'
            }}>
              {serverCompleted ? '初始化完成' : '服务端资源尚未初始化'}
            </Text>
            <br />
            <Text style={{ fontSize: '14px', color: '#999' }}>
              {serverCompleted ? <>服务端资源已准备就绪</>: '请点击初始化按钮执行操作'}
            </Text>

            {/* 服务端部署方式：页面内直接展示，先选再确认初始化 */}
            {!serverCompleted && (
              <div style={{ marginTop: 18, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{ textAlign: 'left' }}>
                  <Text style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>
                    部署方式
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    容器部署更适合弹性扩缩容；虚机部署更接近传统部署方式。选择后点击「确认初始化」生效。
                  </Text>
                </div>

                <Radio.Group
                  value={serverDeployType}
                  onChange={e => {
                    // 交互意图：选择“虚机/容器”部署方式（原型用强类型枚举）
                    setServerDeployType(e.target.value as ServerDeployType)
                  }}
                  style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center' }}
                >
                  <Radio.Button value="vm">虚机部署</Radio.Button>
                  <Radio.Button value="container">容器部署</Radio.Button>
                </Radio.Group>

                <div
                  style={{
                    marginTop: 12,
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.78)'
                  }}
                >
                  {serverDeployType === 'container' ? (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        容器部署（云原生）
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **运行形态**：运行在 K8S / 容器集群中，资源按 Pod/容器调度。
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **优势**：弹性扩缩容更快、发布回滚更标准化、资源利用率更高。
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **适用场景**：流量波动大、需要快速扩容、希望统一云原生交付链路的服务。
                      </Text>
                    </Space>
                  ) : (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        虚机部署（传统）
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **运行形态**：运行在虚拟机实例上，资源以整机/实例维度分配。
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **优势**：环境更贴近传统架构，兼容性更强，排障路径更直观。
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        - **适用场景**：对容器化改造成本敏感、依赖较重、希望先快速落地的服务。
                      </Text>
                    </Space>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </Card>
      </Space>

      {/* 初始化进度弹窗 */}
      <Modal
        title={initProgressData?.title || '初始化进度'}
        open={initProgressVisible}
        footer={null}
        closable={false}
        maskClosable={false}
        width={400}
      >
        {initProgressData && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: 32 }}>
              <SyncOutlined 
                spin 
                style={{ 
                  fontSize: '48px', 
                  color: '#1890ff',
                  marginBottom: 16 
                }} 
              />
              <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: 8 }}>
                {initProgressData.title}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                正在执行{initProgressData.type === 'client' ? '客户端' : '服务端'}初始化...
              </div>
              {initProgressData.type === 'server' && initProgressData.serverDeployType && (
                <div style={{ color: '#666', fontSize: '14px', marginTop: 4 }}>
                  部署方式：{initProgressData.serverDeployType === 'vm' ? '虚机部署' : '容器部署'}
                </div>
              )}
            </div>

            {/* 简化的进度条 */}
            <Progress 
              percent={Math.round((initProgressData.currentStep / initProgressData.totalSteps) * 100)}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              showInfo={false}
              size="default"
            />
            
            <div style={{ marginTop: 16, color: '#666', fontSize: '14px' }}>
              请耐心等待初始化完成
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}