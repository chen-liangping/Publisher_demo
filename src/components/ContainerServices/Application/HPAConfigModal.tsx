"use client"
//公共组件，HPA
import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Row,
  Col,
  InputNumber,
  Checkbox,
  Divider,
  Table,
  Typography,
  Card,
  Switch,
  Button,
  Radio,
  Alert,
  Collapse
} from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { FormInstance } from 'antd/es/form'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'

const { Title } = Typography

// 开启条件数据类型
interface HPACondition {
  key: string;
  event: string;
  description: string;
}

// 开启条件数据
const hpaConditions: HPACondition[] = [
  { key: '架构服务无状态化', event: '架构服务无状态化', description: '避免将用户状态、缓存、事务等保存在本地内存，应放入 Redis、数据库等中心服务。' },
  { key: '接口幂等性保障', event: '接口幂等性保障', description: '关键操作（如下单、支付）必须可重复执行，防止副本间重复处理。' },
  { key: '共享资源使用中心组件', event: '共享资源使用中心组件', description: '避免写入本地文件，使用对象存储、Redis、数据库替代共享目录。' },
  { key: '连接池容量合理配置', event: '连接池容量合理配置', description: '多副本将放大连接数，需控制数据库/Redis 的连接池上限。' },
  { key: '缓存一致性与穿透保护', event: '缓存一致性与穿透保护', description: '处理好缓存一致性与穿透（如使用分布式锁、本地兜底）。' },
  { key: '日志集中收集', event: '日志集中收集', description: '日志应输出到 stdout，并通过日志组件（如 FluentBit）集中采集。' },
  { key: '健康检查配置完整', event: '健康检查配置完整', description: '配置 readinessProbe，确保服务就绪才接流量。' },
  { key: '定时任务单点执行', event: '定时任务单点执行', description: '多副本下避免重复执行定时任务，可使用 Job 或选主机制。' },
  { key: '统一会话管理', event: '统一会话管理', description: '避免本地 session，建议使用 JWT 或 Redis 存储用户登录态。' },
  { key: '限流策略支持多副本', event: '限流策略支持多副本', description: '使用 Redis、服务网格等方案替代本地限流逻辑。' }
]

// HPA配置表单数据类型
export interface HPAFormValues {
  enabled: boolean;
  defaultReplicas?: number;
  minReplicas: number;
  maxReplicas: number;
  cpuEnabled?: boolean;
  cpuTargetValue?: number;
  memEnabled?: boolean;
  memTargetValue?: number;
  scaleInWait?: number;
  scaleOutWait?: number;
}

interface HPAConfigModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: HPAFormValues) => void;
  form: FormInstance<HPAFormValues>;
  initialValues?: Partial<HPAFormValues>;
}

export default function HPAConfigModal({
  open,
  onCancel,
  onOk,
  form,
  initialValues
}: HPAConfigModalProps) {

  const [showConditionsModal, setShowConditionsModal] = useState(false)
  const [conditionsAccepted, setConditionsAccepted] = useState(false)
  const [hpaEnabled, setHpaEnabled] = useState(false)
  const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState(false)

  // 当Modal打开时，重置状态
  useEffect(() => {
    if (open) {
      const initialEnabled = initialValues?.enabled || false
      setHpaEnabled(initialEnabled)
      setConditionsAccepted(false)
      setShowConditionsModal(false)
    }
  }, [open, initialValues])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      onOk(values)
    } catch (error) {
      console.error('HPA配置验证失败:', error)
    }
  }

  const handleConditionsChange = (e: CheckboxChangeEvent) => {
    const checked = e.target.checked
    if (checked) {
      // 如果要开启条件，先显示条件确认
      setShowConditionsModal(true)
    } else {
      // 直接关闭条件
      setConditionsAccepted(false)
      setHpaEnabled(false)
      form.setFieldsValue({ enabled: false })
    }
  }

  const handleConditionsConfirm = () => {
    setShowConditionsModal(false)
    setConditionsAccepted(true)
  }

  const handleConditionsCancel = () => {
    setShowConditionsModal(false)
    // 保持条件关闭状态
    setConditionsAccepted(false)
  }

  const handleHpaToggle = (checked: boolean) => {
    setHpaEnabled(checked)
    form.setFieldsValue({ enabled: checked })
  }

  // 开启条件表格列配置
  const conditionsColumns: ColumnsType<HPACondition> = [
    {
      title: '事件',
      dataIndex: 'event',
      key: 'event',
      width: 160
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    }
  ]

  return (
    <>
      <Modal
        title="HPA 弹性伸缩配置"
        open={open}
        onCancel={onCancel}
        onOk={handleSubmit}
        width={600}
      >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        {/* 开启条件区域 */}
        <div style={{ marginBottom: 16 }}>
          <Checkbox 
            checked={conditionsAccepted}
            onChange={handleConditionsChange}
          >
            请先确保已满足《多副本与HPA开启条件》
          </Checkbox>
        </div>

        {/* HPA配置卡片 */}
        <Card 
          style={{ 
            backgroundColor: '#f5f5f5',
            border: '1px solid #d9d9d9'
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>启用 HPA 弹性伸缩</span>
            <Switch 
              checked={hpaEnabled}
              onChange={handleHpaToggle}
              disabled={!conditionsAccepted}
            />
          </div>

          {/* 副本数配置 - 根据HPA状态显示不同的配置 */}
          {conditionsAccepted && !hpaEnabled && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Form.Item label="默认副本数" name="defaultReplicas">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {conditionsAccepted && hpaEnabled && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Form.Item label="最小副本数" name="minReplicas">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大副本数" name="maxReplicas">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* 副本数配置 - 条件未确认时只读 */}
          {!conditionsAccepted && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Form.Item label="默认副本数">
                  <InputNumber min={1} style={{ width: '100%' }} disabled value={1} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* HPA高级配置 - 只有开启HPA后才显示 */}
          {conditionsAccepted && hpaEnabled && (
            <>
              <Divider />
              
              {/* CPU指标配置 */}
              <Form.Item name="cpuEnabled" valuePropName="checked">
                <Checkbox>CPU 指标</Checkbox>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.cpuEnabled !== currentValues.cpuEnabled}>
                {({ getFieldValue }) => {
                  const cpuEnabled = getFieldValue('cpuEnabled')
                  return cpuEnabled ? (
                    <div style={{ marginLeft: 24, marginBottom: 16 }}>
                      <Form.Item label="CPU 稳定值 (%)" name="cpuTargetValue">
                        <InputNumber 
                          min={1} 
                          max={100} 
                          style={{ width: '100%' }} 
                          placeholder="请输入CPU稳定值"
                        />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.cpuTargetValue !== currentValues.cpuTargetValue}>
                        {({ getFieldValue }) => {
                          const cpuTargetValue = getFieldValue('cpuTargetValue')
                          return cpuTargetValue ? (
                            <Alert
                              message={`Pod CPU 使用率将趋于稳定值 ${cpuTargetValue}%`}
                              type="info"
                              showIcon
                              style={{ marginTop: 8 }}
                            />
                          ) : null
                        }}
                      </Form.Item>
                    </div>
                  ) : null
                }}
              </Form.Item>

              {/* 内存指标配置 */}
              <Form.Item name="memEnabled" valuePropName="checked">
                <Checkbox>内存指标</Checkbox>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.memEnabled !== currentValues.memEnabled}>
                {({ getFieldValue }) => {
                  const memEnabled = getFieldValue('memEnabled')
                  return memEnabled ? (
                    <div style={{ marginLeft: 24, marginBottom: 16 }}>
                      <Form.Item label="内存稳定值 (%)" name="memTargetValue">
                        <InputNumber 
                          min={1} 
                          max={100} 
                          style={{ width: '100%' }} 
                          placeholder="请输入内存稳定值"
                        />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.memTargetValue !== currentValues.memTargetValue}>
                        {({ getFieldValue }) => {
                          const memTargetValue = getFieldValue('memTargetValue')
                          return memTargetValue ? (
                            <Alert
                              message={`Pod 内存使用率将趋于稳定值 ${memTargetValue}%`}
                              type="info"
                              showIcon
                              style={{ marginTop: 8 }}
                            />
                          ) : null
                        }}
                      </Form.Item>
                    </div>
                  ) : null
                }}
              </Form.Item>
              
              {/* 高级配置 - 可折叠 */}
              <div style={{ marginTop: 16 }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    marginBottom: advancedConfigExpanded ? 16 : 0
                  }}
                  onClick={() => setAdvancedConfigExpanded(!advancedConfigExpanded)}
                >
                  <span style={{ fontSize: 14, fontWeight: 500 }}>高级配置</span>
                  {advancedConfigExpanded ? <UpOutlined style={{ marginLeft: 8 }} /> : <DownOutlined style={{ marginLeft: 8 }} />}
                </div>
                
                {advancedConfigExpanded && (
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Form.Item label="缩容冷却时间 (秒)" name="scaleInWait">
                        <InputNumber min={60} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="扩容冷却时间 (秒)" name="scaleOutWait">
                        <InputNumber min={60} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>
            </>
          )}
        </Card>
      </Form>
      </Modal>

      {/* 开启条件确认对话框 */}
      <Modal
        title={
          <div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              多副本与HPA开启条件
            </Title>
          </div>
        }
        open={showConditionsModal}
        onCancel={handleConditionsCancel}
        onOk={handleConditionsConfirm}
        width={800}
        okText="确认开启"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Checkbox checked style={{ color: '#52c41a' }}>
            请先确保已满足《多副本与HPA开启条件》
          </Checkbox>
        </div>
        
        <div className="table-without-footer">
          <Table
            columns={conditionsColumns}
            dataSource={hpaConditions}
            pagination={false}
            size="small"
            scroll={{ x: 160 }}
            style={{ minWidth: '100%' }}
          />
        </div>
      </Modal>
    </>
  )
}
