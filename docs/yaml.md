管理台新增菜单，yaml 备份
点击菜单后，进入内容页，内容页由tree架构组成，


const treeData: TreeDataNode[] = [
  {
    title: 'k8s-io',
    key: 'service',
    children: [
      {
        title: 'deployment',
        key: 'deployment',}
]
}
]

tree左侧是列表页，列表字段
- 名称
- 创建时间
- 查看yaml
支持通过名称进行搜索
点击查看yaml，drawer展示yaml内容，支持一键复制

---

对文件层级重新定义
namespace、
service、
ConfigMap、
PersistentVolumeClaim、
PersistentVolume
MseIngressConfig
networking.k8s.io
IngressClass、
Ingress、
NetworkPolicy
HorizontalPodAUtoscaler