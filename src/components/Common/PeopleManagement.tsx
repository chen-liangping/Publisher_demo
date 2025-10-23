'use client'

import React, { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  message,
  Tooltip,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'

const { Title } = Typography

// 人员数据类型定义
interface Person {
  id: string
  name: string
  dingId: string
}

export default function PeopleManagement(): React.ReactElement {
  // 人员配置相关状态
  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false)
  const [people, setPeople] = useState<Person[]>([
    { id: 'slime', name: '史迪仔', dingId: 'dingtalk:slime' },
    { id: 'xuyin', name: '徐音', dingId: 'dingtalk:xuyin' }
  ])
  const [personForm] = Form.useForm<Person>()

  // 人员管理相关处理函数
  const handleAddPerson = (): void => {
    personForm.resetFields()
    setAddPersonOpen(true)
  }

  const handleDeletePerson = (personId: string): void => {
    setPeople(prev => prev.filter(p => p.id !== personId))
    message.success('人员删除成功')
  }

  const onSubmitAddPerson = (): void => {
    personForm.validateFields().then((values: Person) => {
      const newPerson: Person = {
        ...values,
        id: `person_${Date.now()}`
      }
      setPeople(prev => [...prev, newPerson])
      setAddPersonOpen(false)
      message.success('人员添加成功')
    }).catch(() => {
      message.error('请检查表单信息')
    })
  }

  // 人员表格列定义
  const peopleColumns: ColumnsType<Person> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '钉钉ID',
      dataIndex: 'dingId',
      key: 'dingId'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Person) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => message.info(`编辑 ${record.name}`)}
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeletePerson(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>人员配置</Title>
      </div>

      <Card
        title={
          <Space>
            <TeamOutlined />
            <span style={{ fontSize: 18 }}>人员管理</span>
          </Space>
        }
        extra={
          <Tooltip title="新增人员">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPerson} />
          </Tooltip>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        <Table<Person>
          rowKey="id"
          columns={peopleColumns}
          dataSource={people}
          pagination={{ pageSize: 10 }}
        />

        {/* 新增人员抽屉 */}
        <Drawer
          title="新增人员"
          open={addPersonOpen}
          width={480}
          onClose={() => setAddPersonOpen(false)}
          destroyOnClose
          footer={
            <div style={{ textAlign: 'left' }}>
              <Space>
                <Button onClick={() => setAddPersonOpen(false)}>取消</Button>
                <Button type="primary" onClick={onSubmitAddPerson}>保存</Button>
              </Space>
            </div>
          }
        >
          <Form<Person> form={personForm} layout="vertical">
            <Form.Item
              label="钉钉名称"
              name="name"
              rules={[{ required: true, message: '请输入钉钉联系人名称' }]}
            >
              <Input placeholder="例如：王小明" />
            </Form.Item>
            <Form.Item
              label="钉钉ID"
              name="dingId"
              rules={[{ required: true, message: '请输入 dingtalk ID' }]}
            >
              <Input placeholder="例如：dingtalk:123456" />
            </Form.Item>
          </Form>
        </Drawer>
      </Card>
    </div>
  )
}

