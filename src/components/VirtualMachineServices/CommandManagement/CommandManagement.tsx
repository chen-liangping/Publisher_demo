'use client'

import React, { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import PromptManager from './PromptManager'
import type { TableColumnsType } from 'antd'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 命令数据类型定义
interface Command {
  id: string
  name: string
  template: string
  tags: string[]
  description?: string
  createTime: string
  hasFileParam: boolean
}

// 虚拟机数据类型（简化）
interface VirtualMachine {
  id: string
  alias: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
}

// OSS文件数据类型（简化）
interface OSSFile {
  id: string
  name: string
  path: string
}

// 模拟命令数据
const mockCommandData: Command[] = [
  {
    id: '1',
    name: '部署应用',
    template: 'cd /app && ./deploy.sh {file}',
    tags: ['部署'],
    description: '使用部署脚本部署应用',
    createTime: '2024-01-15 10:30:00',
    hasFileParam: true
  },
  {
    id: '2',
    name: '重启服务',
    template: 'systemctl restart nginx',
    tags: ['维护'],
    description: '重启Nginx服务',
    createTime: '2024-01-14 15:20:00',
    hasFileParam: false
  },
  {
    id: '3',
    name: '查看系统状态',
    template: 'top -n 1 && df -h',
    tags: ['调试'],
    createTime: '2024-01-13 09:15:00',
    hasFileParam: false
  }
]

// 模拟虚拟机数据
const mockVMData: VirtualMachine[] = [
  { id: 'i-bp1234567890abcdef', alias: 'Web服务器1', status: 'running' },
  { id: 'i-bp0987654321fedcba', alias: '数据库服务器', status: 'running' }
]

// 模拟OSS文件数据
const mockOSSFiles: OSSFile[] = [
  { id: '1', name: 'deploy-script.sh', path: '/scripts/deploy-script.sh' },
  { id: '2', name: 'config.json', path: '/config/config.json' },
  { id: '4', name: 'backup.tar.gz', path: '/backup/backup.tar.gz' }
]

// 组件接口定义
interface CommandManagementProps {
  onViewDetails?: (command: Command) => void
}

export default function CommandManagement({ onViewDetails }: CommandManagementProps = {}) {
  const [commandList, setCommandList] = useState<Command[]>(mockCommandData)
  const [loading, setLoading] = useState<boolean>(false)
  const [showCommandForm, setShowCommandForm] = useState<boolean>(false)
  const [showExecuteModal, setShowExecuteModal] = useState<boolean>(false)
  const [editingCommand, setEditingCommand] = useState<Command | null>(null)
  const [executingCommand, setExecutingCommand] = useState<Command | null>(null)
  const [form] = Form.useForm()
  const [executeForm] = Form.useForm()
  const [viewingCommand, setViewingCommand] = useState<Command | null>(null)

  // 标签选项
  const tagOptions = ['部署', '调试', '维护', '监控', '备份']

  // 新建命令
  const handleCreateCommand = (): void => {
    setEditingCommand(null)
    form.resetFields()
    setShowCommandForm(true)
  }

  // 编辑命令
  const handleEditCommand = (command: Command): void => {
    setEditingCommand(command)
    form.setFieldsValue(command)
    setShowCommandForm(true)
  }

  // 删除命令
  const handleDeleteCommand = (commandId: string): void => {
    setLoading(true)
    setTimeout(() => {
      const newCommandList = commandList.filter(cmd => cmd.id !== commandId)
      setCommandList(newCommandList)
      setLoading(false)
      message.success('命令删除成功')
    }, 500)
  }

  // 保存命令
  const handleSaveCommand = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      const hasFileParam = values.template.includes('{file}')
      
      if (editingCommand) {
        // 编辑模式
        const updatedCommand: Command = {
          ...editingCommand,
          ...values,
          hasFileParam
        }
        const newCommandList = commandList.map(cmd => 
          cmd.id === editingCommand.id ? updatedCommand : cmd
        )
        setCommandList(newCommandList)
        message.success('命令更新成功')
      } else {
        // 新建模式
        const newCommand: Command = {
          id: Date.now().toString(),
          ...values,
          hasFileParam,
          createTime: new Date().toLocaleString('zh-CN')
        }
        setCommandList([newCommand, ...commandList])
        message.success('命令创建成功')
      }
      
      setShowCommandForm(false)
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  // 执行命令
  const handleExecuteCommand = (command: Command): void => {
    setExecutingCommand(command)
    executeForm.resetFields()
    setShowExecuteModal(true)
  }

  // 确认执行命令
  const handleConfirmExecute = async (): Promise<void> => {
    try {
      const values = await executeForm.validateFields()
      setShowExecuteModal(false)
      
      // 模拟命令执行
      message.loading('正在执行命令，请稍候...', 0)
      
      setTimeout(() => {
        message.destroy()
        const isSuccess = Math.random() > 0.3 // 70%成功率
        
        if (isSuccess) {
          Modal.success({
            title: '命令执行成功',
            content: (
              <div>
                <p><strong>命令：</strong>{executingCommand?.name}</p>
                <p><strong>目标虚拟机：</strong>{values.vmId}</p>
                {values.fileId && <p><strong>关联文件：</strong>{values.fileId}</p>}
                <p><strong>执行结果：</strong>命令执行完成，操作成功</p>
              </div>
            )
          })
        } else {
          Modal.error({
            title: '命令执行失败',
            content: (
              <div>
                <p><strong>命令：</strong>{executingCommand?.name}</p>
                <p><strong>目标虚拟机：</strong>{values.vmId}</p>
                <p><strong>错误信息：</strong>连接超时或权限不足</p>
              </div>
            )
          })
        }
      }, 2000)
      
    } catch (error) {
      console.error('Execute form validation failed:', error)
    }
  }

  // 表格列配置
  const columns: TableColumnsType<Command> = [
    {
      title: '命令名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Command) => (
        // 点击命令名称进入详情页（在 Modal 中打开 PromptManager）
        <Button type="link" onClick={() => { setViewingCommand(record); if (onViewDetails) onViewDetails(record) }}>{name}</Button>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </>
      )
    },

    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, command: Command) => (
        <Space>
          <Tooltip title="执行">
            <Button type="text" icon={<PlayCircleOutlined />} onClick={() => handleExecuteCommand(command)} />
          </Tooltip>
          {/* 详情图标已移除；点击命令名称可打开详情 */}
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEditCommand(command)} />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除这个命令吗？"
              onConfirm={() => handleDeleteCommand(command.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>命令管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateCommand}
        >
          新建命令
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={commandList}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个命令`
          }}
        />
      </Card>

      {/* 命令详情 Drawer（嵌入 PromptManager） */}
      <Drawer
        title={viewingCommand ? `命令详情 - ${viewingCommand.name}` : ''}
        open={!!viewingCommand}
        width={900}
        destroyOnClose
        onClose={() => setViewingCommand(null)}
      >
        {viewingCommand ? (
          <PromptManager
            command={viewingCommand}
            // 点击返回：关闭抽屉
            onBack={() => setViewingCommand(null)}
            // 在详情里点“编辑”：关闭抽屉后打开编辑弹窗
            onEdit={(cmd) => { setViewingCommand(null); handleEditCommand(cmd) }}
            // 在详情里点“执行”：关闭抽屉后打开执行弹窗
            onExecute={(cmd) => { setViewingCommand(null); handleExecuteCommand(cmd) }}
          />
        ) : null}
      </Drawer>

      {/* 新建/编辑命令弹窗 */}
      <Modal
        title={editingCommand ? '编辑命令' : '新建命令'}
        open={showCommandForm}
        onOk={handleSaveCommand}
        onCancel={() => setShowCommandForm(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="命令名称"
            rules={[{ required: true, message: '请输入命令名称' }]}
          >
            <Input placeholder="请输入命令名称" />
          </Form.Item>

          <Form.Item
            name="template"
            label="命令模板"
            rules={[{ required: true, message: '请输入命令模板' }]}
            extra="支持使用 {file} 占位符，执行时可关联OSS文件"
          >
            <TextArea 
              rows={4}
              placeholder="例如: cd /app && ./deploy.sh {file}"
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="multiple"
              placeholder="请选择标签"
              options={tagOptions.map(tag => ({ label: tag, value: tag }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea 
              rows={2}
              placeholder="请输入命令描述（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行命令弹窗 */}
      <Modal
        title="执行命令"
        open={showExecuteModal}
        onOk={handleConfirmExecute}
        onCancel={() => setShowExecuteModal(false)}
        okText="执行命令"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <CodeOutlined />
            <strong>命令：</strong>
            <span>{executingCommand?.name}</span>
          </Space>
        </div>
        
        <Form
          form={executeForm}
          layout="vertical"
        >
          <Form.Item
            name="vmId"
            label="目标虚拟机"
            rules={[{ required: true, message: '请选择目标虚拟机' }]}
          >
            <Select placeholder="请选择虚拟机">
              {mockVMData.filter(vm => vm.status === 'running').map(vm => (
                <Option key={vm.id} value={vm.alias}>
                  {vm.alias}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {executingCommand?.hasFileParam && (
            <Form.Item
              name="fileId"
              label="关联文件"
              rules={[{ required: true, message: '请选择要关联的文件' }]}
            >
              <Select placeholder="请选择OSS文件">
                {mockOSSFiles.map(file => (
                  <Option key={file.id} value={file.name}>
                    {file.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}