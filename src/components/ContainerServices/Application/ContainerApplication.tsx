'use client'

import React from 'react'
import { Card, Typography, Row, Col, Button, Tag } from 'antd'
import { AppstoreOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function ContainerApplication() {
  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined style={{ color: '#1890ff' }} />
          容器应用管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          创建应用
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 200 }}
            styles={{ body: { padding: '20px' } }}
            actions={[
              <Button key="config" type="text" icon={<SettingOutlined />}>
                配置
              </Button>
            ]}
          >
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                Web应用示例
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                基于Docker的Web应用容器
              </Text>
              <div style={{ marginTop: 12 }}>
                <Tag color="green">运行中</Tag>
                <Tag>端口: 8080</Tag>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 200 }}
            styles={{ body: { padding: '20px' } }}
            actions={[
              <Button key="config" type="text" icon={<SettingOutlined />}>
                配置
              </Button>
            ]}
          >
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                API服务
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                RESTful API微服务容器
              </Text>
              <div style={{ marginTop: 12 }}>
                <Tag color="orange">待部署</Tag>
                <Tag>端口: 3000</Tag>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ height: 200, borderStyle: 'dashed' }}
            styles={{ body: { padding: '20px' } }}
          >
            <div style={{ textAlign: 'center', color: '#999' }}>
              <PlusOutlined style={{ fontSize: '32px', marginBottom: 12 }} />
              <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#999' }}>
                添加新应用
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                点击创建新的容器应用
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          应用监控概览
        </Title>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>2</div>
              <div style={{ color: '#666', fontSize: '12px' }}>运行中</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>1</div>
              <div style={{ color: '#666', fontSize: '12px' }}>待部署</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>0</div>
              <div style={{ color: '#666', fontSize: '12px' }}>异常</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>3</div>
              <div style={{ color: '#666', fontSize: '12px' }}>总计</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}