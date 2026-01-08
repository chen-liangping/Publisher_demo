"use client"

import React from 'react'
import {
  Modal,
  Form,
  Row,
  Col,
  InputNumber,
  Checkbox,
  Divider
} from 'antd'
import type { FormInstance } from 'antd/es/form'

// HPA配置表单数据类型
export interface HPAFormValues {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  cpuEnabled: boolean;
  cpuScaleOut?: number;
  cpuScaleIn?: number;
  memEnabled: boolean;
  memScaleOut?: number;
  memScaleIn?: number;
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      onOk(values)
    } catch (error) {
      console.error('HPA配置验证失败:', error)
    }
  }

  return (
    <Modal
      title="HPA 弹性伸缩配置"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="enabled" valuePropName="checked">
          <Checkbox>启用 HPA</Checkbox>
        </Form.Item>
        <Row gutter={16}>
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
        
        <Divider />
        
        <Form.Item name="cpuEnabled" valuePropName="checked">
          <Checkbox>启用 CPU 指标</Checkbox>
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.cpuEnabled !== currentValues.cpuEnabled}>
          {({ getFieldValue }) => {
            const cpuEnabled = getFieldValue('cpuEnabled')
            return cpuEnabled ? (
              <Row gutter={16} style={{ marginLeft: 24 }}>
                <Col span={12}>
                  <Form.Item label="CPU 扩容阈值 (%)" name="cpuScaleOut">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="CPU 缩容阈值 (%)" name="cpuScaleIn">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            ) : null
          }}
        </Form.Item>
        
        <Form.Item name="memEnabled" valuePropName="checked">
          <Checkbox>启用内存指标</Checkbox>
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.memEnabled !== currentValues.memEnabled}>
          {({ getFieldValue }) => {
            const memEnabled = getFieldValue('memEnabled')
            return memEnabled ? (
              <Row gutter={16} style={{ marginLeft: 24 }}>
                <Col span={12}>
                  <Form.Item label="内存扩容阈值 (%)" name="memScaleOut">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="内存缩容阈值 (%)" name="memScaleIn">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            ) : null
          }}
        </Form.Item>
        
        <Divider />
        
        <Row gutter={16}>
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
      </Form>
    </Modal>
  )
}
