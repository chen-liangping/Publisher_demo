---
name: ls-ops
description: Act as a Linux operations expert assistant. When the user types the keyword "ls-ops" or asks for common maintenance commands, output a clean, well-formatted checklist of storage, file operations, PM2 process management, and curl-based health checks (including status codes).
---

# Linux 运维常用命令清单（触发词：ls-ops）

## 使用方式
- **当用户输入关键词 `ls-ops`** 或 **请求“常用命令/维护清单”** 时：直接输出下面清单（格式保持整齐），必要时附带简短参数说明。

---

## 存储管理（挂载点 / 分区 / 磁盘类型）

### 1) 查看挂载点、文件系统类型、容量

```bash
lsblk -f
```

- **说明**：展示块设备树、文件系统类型（FSTYPE）、UUID、挂载点（MOUNTPOINT）。

### 2) 查看分区大小、已用、剩余（人类可读 GB/MB）

```bash
df -hT
```

- **参数**：
  - `-h`：自动换算单位（GB/MB）
  - `-T`：显示文件系统类型

### 3) 查看磁盘类型（SSD/HDD）与轮转属性

```bash
lsblk -d -o NAME,MODEL,SIZE,ROTA,TYPE
```

- **说明**：
  - `ROTA=1` 通常代表机械盘（rotational），`ROTA=0` 通常代表 SSD。

### 4) 查看某个目录占用（快速定位大目录）

```bash
du -h -d 1 /path/to/dir | sort -h
```

- **参数**：
  - `-d 1`：只展开一层（不同发行版可能用 `--max-depth=1`）

---

## 文件处理（移动文件/文件夹）

### 1) 移动文件到指定路径（保留原文件名）

```bash
mv /path/to/file /path/to/target/
```

### 2) 移动文件夹到指定路径

```bash
mv /path/to/folder /path/to/target/
```

### 3) 覆盖确认（更安全）

```bash
mv -i /path/to/file /path/to/target/
```

- **参数**：
  - `-i`：覆盖前询问（interactive）

### 4) 静默移动（强制覆盖，不提示）

```bash
mv -f /path/to/file /path/to/target/
```

- **参数**：
  - `-f`：强制覆盖（force），谨慎使用

### 5) 不覆盖（目标存在则跳过）

```bash
mv -n /path/to/file /path/to/target/
```

- **参数**：
  - `-n`：不覆盖（no-clobber）

---

## 进程管理（PM2）

> 下面以 Node 服务为例，按你的项目入口脚本替换 `app.js` / `npm` 命令即可。

### 1) 启动应用（命名进程）

```bash
pm2 start app.js --name my-app
```

### 2) 启动 npm script（常用于 Next/Node 项目）

```bash
pm2 start npm --name my-app -- run start
```

### 3) 列出所有进程 / 查看详情

```bash
pm2 ls
pm2 describe my-app
```

### 4) 停止 / 重启 / 删除（按名称）

```bash
pm2 stop my-app
pm2 restart my-app
pm2 delete my-app
```

### 5) 查看日志（实时）

```bash
pm2 logs my-app
```

### 6) 开机自启与保存当前进程列表（常用组合）

```bash
pm2 save
pm2 startup
```

- **说明**：
  - `pm2 save`：保存当前进程列表（重启后恢复）
  - `pm2 startup`：生成 systemd/launch 脚本提示（按输出执行）

---

## 网络健康检查（curl 80 端口 + 状态码）

### 1) 仅查看 HTTP 状态码（推荐健康检查最常用）

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

- **说明**：
  - `-s`：静默
  - `-o /dev/null`：丢弃响应体
  - `-w "%{http_code}\n"`：只输出状态码

### 2) 指定远程主机的 80 端口

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://example.com:80/health
```

### 3) 同时查看耗时（排查慢请求）

```bash
curl -s -o /dev/null -w "code=%{http_code} time_total=%{time_total}s\n" http://example.com:80/
```

### 4) 打印响应头（定位重定向/缓存/网关信息）

```bash
curl -I http://example.com:80/
```

---

## 输出要求（给助手）
- 输出必须分区块（存储/文件/PM2/网络），**格式整齐**，命令可直接复制。
- 参数说明保持简短：只解释关键 flag（例如 `-h/-T/-i/-f/-n`、`curl -w` 等）。

