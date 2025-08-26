export type AppItem = {
  id: string
  name: string
  tags: string[]
  status: 'running' | 'failed' | 'stopped'
  pods: number
  containers: string[]
}

export const apps: AppItem[] = [
  {
    id: '1',
    name: 'kumo游服',
    tags: ['游服'],
    status: 'running',
    pods: 3,
    containers: ['game-server:v0.8.1', 'center-server:v2.3']
  },
  {
    id: '2',
    name: 'xcron-cloud',
    tags: ['平台'],
    status: 'running',
    pods: 3,
    containers: ['game-server:v0.8.2']
  },
  {
    id: '3',
    name: 'xcron-cloud2',
    tags: ['游服'],
    status: 'failed',
    pods: 3,
    containers: ['game-server:v0.8.10']
  },
  {
    id: '4',
    name: 'xcron-cloud3',
    tags: ['平台'],
    status: 'running',
    pods: 3,
    containers: ['game-server:v0.8.2']
  }
]

