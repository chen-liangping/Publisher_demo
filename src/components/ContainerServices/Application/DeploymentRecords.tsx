"use client"

import React from 'react'
import { Card, Table, Typography, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

// 部署分组数据类型
export interface DeployGroup {
  key: string;
  groupName: string;
  note: string;
  services: string[] | string;
  imageVersion: string;
  graceful?: string;
  exposePort?: number | string;
}

// 变更记录数据类型
export interface DeployConfig {
  key: string;
  image: string;
  envCount: number;
  cmd: string;
  ports: string;
  health: {
    type: string;
    path: string;
    port: number;
    initialDelay: number;
  };
  protocol: string;
  mounts: number;
  preStop: string;
  graceful: string;
  externalPort: number;
}

interface DeploymentRecordsProps {
  deployGroups?: DeployGroup[];
  deployConfigs?: DeployConfig[];
  onCreateGroup?: () => void;
  showGroupSection?: boolean;
}

export default function DeploymentRecords({
  deployGroups = [],
  deployConfigs = [],
  onCreateGroup,
  showGroupSection = true
}: DeploymentRecordsProps) {

  // 部署分组表格列配置
  const groupColumns: ColumnsType<DeployGroup> = [
    { title: '分组名称', dataIndex: 'groupName', key: 'groupName' },
    { title: '备注', dataIndex: 'note', key: 'note' },
    { 
      title: '服务', 
      dataIndex: 'services', 
      key: 'services',
      render: (services: string[] | string) => 
        Array.isArray(services) ? services.join(', ') : services
    },
    { title: '镜像版本', dataIndex: 'imageVersion', key: 'imageVersion' },
    { title: '优雅关闭', dataIndex: 'graceful', key: 'graceful' },
    { title: '暴露端口', dataIndex: 'exposePort', key: 'exposePort' },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small" danger>删除</Button>
        </Space>
      )
    }
  ]

  // 变更记录表格列配置
  const deployColumns: ColumnsType<DeployConfig> = [
    { title: '镜像', dataIndex: 'image', key: 'image' },
    { title: '环境变量', dataIndex: 'envCount', key: 'envCount' },
    { title: '启动命令', dataIndex: 'cmd', key: 'cmd' },
    { title: '端口', dataIndex: 'ports', key: 'ports' },
    { title: '协议', dataIndex: 'protocol', key: 'protocol' },
    { title: '挂载数', dataIndex: 'mounts', key: 'mounts' },
    { title: '优雅关闭', dataIndex: 'graceful', key: 'graceful' },
    { title: '外部端口', dataIndex: 'externalPort', key: 'externalPort' },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">查看详情</Button>
          <Button type="link" size="small">编辑</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      {showGroupSection && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>配置</Title>
            <Space>
              <Button type="primary" onClick={onCreateGroup}>新建分组</Button>
            </Space>
          </div>
          <div style={{ marginTop: 8 }}>
            <Card>
              <Table 
                columns={groupColumns} 
                dataSource={deployGroups} 
                pagination={false} 
                size="small"
              />
            </Card>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <Title level={4}>变更记录</Title>
        <Card>
          <Table
            columns={deployColumns}
            dataSource={deployConfigs}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </div>
  )
}
