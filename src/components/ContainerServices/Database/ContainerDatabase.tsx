'use client'

import React from 'react'
import { Card, Typography, Row, Col, Button, Tag, Progress } from 'antd'
import { DatabaseOutlined, PlusOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function ContainerDatabase() {
  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatabaseOutlined style={{ color: '#52c41a' }} />
          容器数据库管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          创建数据库
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 240 }}
            bodyStyle={{ padding: '20px' }}
            actions={[
              <Button key="config" type="text" icon={<SettingOutlined />}>
                配置
              </Button>,
              <Button key="backup" type="text" icon={<ReloadOutlined />}>
                备份
              </Button>
            ]}
          >
            <div style={{ textAlign: 'center' }}>
              <DatabaseOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                PostgreSQL
              </Title>
              <Text type="secondary" style={{ fontSize: '12px', marginBottom: 12, display: 'block' }}>
                主数据库实例
              </Text>
              <div style={{ marginBottom: 12 }}>
                <Tag color="green">运行中</Tag>
                <Tag>端口: 5432</Tag>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: '12px', color: '#666' }}>存储使用率</Text>
                <Progress percent={65} size="small" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 240 }}
            bodyStyle={{ padding: '20px' }}
            actions={[
              <Button key="config" type="text" icon={<SettingOutlined />}>
                配置
              </Button>,
              <Button key="backup" type="text" icon={<ReloadOutlined />}>
                备份
              </Button>
            ]}
          >
            <div style={{ textAlign: 'center' }}>
              <DatabaseOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                Redis
              </Title>
              <Text type="secondary" style={{ fontSize: '12px', marginBottom: 12, display: 'block' }}>
                缓存数据库
              </Text>
              <div style={{ marginBottom: 12 }}>
                <Tag color="green">运行中</Tag>
                <Tag>端口: 6379</Tag>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: '12px', color: '#666' }}>内存使用率</Text>
                <Progress percent={32} size="small" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 240, borderStyle: 'dashed' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ textAlign: 'center', color: '#999' }}>
              <PlusOutlined style={{ fontSize: '32px', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#999' }}>
                添加数据库
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                支持MySQL、PostgreSQL、Redis等
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
              数据库状态
            </Title>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>2</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>运行中</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>2</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>总计</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
              性能监控
            </Title>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: '12px' }}>CPU使用率</Text>
                <Text style={{ fontSize: '12px' }}>23%</Text>
              </div>
              <Progress percent={23} size="small" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: '12px' }}>内存使用率</Text>
                <Text style={{ fontSize: '12px' }}>48%</Text>
              </div>
              <Progress percent={48} size="small" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}