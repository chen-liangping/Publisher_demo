#!/bin/bash

# 部署脚本 - 虚拟机管理平台原型
# 功能：检测依赖、清理缓存、处理端口占用、启动开发服务器

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js (推荐版本 18+)"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    log_success "Node.js 版本: $NODE_VERSION"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    log_success "npm 版本: $NPM_VERSION"
}

# 检查项目依赖
check_dependencies() {
    log_info "检查项目依赖..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules 不存在，需要安装依赖"
        return 1
    fi
    
    # 检查关键依赖是否已安装
    REQUIRED_DEPS=("next" "react" "antd" "@ant-design/icons")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if [ ! -d "node_modules/$dep" ]; then
            log_warning "依赖 $dep 未安装"
            return 1
        fi
    done
    
    log_success "所有依赖已安装"
    return 0
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 清理可能损坏的 node_modules
    if [ -d "node_modules" ]; then
        log_info "清理现有 node_modules..."
        rm -rf node_modules
    fi
    
    # 清理 package-lock.json 如果存在冲突
    if [ -f "package-lock.json" ]; then
        log_info "备份并重新生成 package-lock.json..."
        mv package-lock.json package-lock.json.bak
    fi
    
    # 安装依赖
    log_info "执行 npm install..."
    npm install
    
    log_success "依赖安装完成"
}

# 清理缓存
clean_cache() {
    log_info "清理项目缓存..."
    
    # 清理 Next.js 缓存
    if [ -d ".next" ]; then
        log_info "清理 .next 缓存..."
        rm -rf .next
    fi
    
    # 清理 npm 缓存
    log_info "清理 npm 缓存..."
    npm cache clean --force
    
    # 清理 Turbopack 缓存
    if [ -d ".turbo" ]; then
        log_info "清理 .turbo 缓存..."
        rm -rf .turbo
    fi
    
    log_success "缓存清理完成"
}

# 检查并清理端口占用
check_and_kill_port() {
    local port=$1
    log_info "检查端口 $port 占用情况..."
    
    # 查找占用端口的进程
    PID=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$PID" ]; then
        log_warning "端口 $port 被进程 $PID 占用"
        log_info "正在终止进程 $PID..."
        
        # 尝试优雅终止
        kill $PID 2>/dev/null || true
        sleep 2
        
        # 检查进程是否仍然存在
        if kill -0 $PID 2>/dev/null; then
            log_warning "优雅终止失败，强制终止进程..."
            kill -9 $PID 2>/dev/null || true
        fi
        
        log_success "端口 $port 已释放"
    else
        log_success "端口 $port 未被占用"
    fi
}

# 修复 Tailwind CSS 配置
fix_tailwind_config() {
    log_info "检查 Tailwind CSS 配置..."
    
    # 检查 tailwind.config.ts 是否存在
    if [ ! -f "tailwind.config.ts" ]; then
        log_warning "tailwind.config.ts 不存在，创建默认配置..."
        cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
}
export default config
EOF
        log_success "Tailwind CSS 配置已创建"
    fi
    
    # 检查 postcss.config.mjs 是否存在
    if [ ! -f "postcss.config.mjs" ]; then
        log_warning "postcss.config.mjs 不存在，创建默认配置..."
        cat > postcss.config.mjs << 'EOF'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
}

export default config
EOF
        log_success "PostCSS 配置已创建"
    fi
}

# 启动开发服务器
start_dev_server() {
    local port=${1:-3000}
    log_info "启动开发服务器 (端口: $port)..."
    
    # 设置环境变量
    export PORT=$port
    
    # 启动服务器
    log_info "执行 npm run dev..."
    npm run dev &
    
    # 获取服务器进程 ID
    DEV_PID=$!
    
    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 5
    
    # 检查服务器是否成功启动
    for i in {1..10}; do
        if curl -s -f http://localhost:$port > /dev/null 2>&1; then
            log_success "开发服务器已启动！"
            log_success "访问地址: http://localhost:$port"
            log_success "网络地址: http://$(ipconfig getifaddr en0 2>/dev/null || hostname):$port"
            return 0
        fi
        log_info "等待服务器响应... ($i/10)"
        sleep 2
    done
    
    log_error "服务器启动失败或响应超时"
    return 1
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -p, --port PORT    指定端口号 (默认: 3000)"
    echo "  -c, --clean        强制清理缓存和重新安装依赖"
    echo "  -h, --help         显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                 # 使用默认端口 3000"
    echo "  $0 -p 8080         # 使用端口 8080"
    echo "  $0 --clean         # 强制清理并重新安装"
}

# 主函数
main() {
    local port=3000
    local force_clean=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -c|--clean)
                force_clean=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "========================================="
    log_info "虚拟机管理平台 - 部署脚本"
    log_info "========================================="
    
    # 检查系统要求
    check_system_requirements
    
    # 检查并清理端口占用
    check_and_kill_port $port
    
    # 清理缓存
    if [ "$force_clean" = true ]; then
        clean_cache
    fi
    
    # 修复 Tailwind CSS 配置
    fix_tailwind_config
    
    # 检查依赖
    if ! check_dependencies || [ "$force_clean" = true ]; then
        install_dependencies
    fi
    
    # 启动开发服务器
    if start_dev_server $port; then
        log_info "========================================="
        log_success "部署完成！"
        log_info "按 Ctrl+C 停止服务器"
        log_info "========================================="
        
        # 等待用户中断
        wait $DEV_PID
    else
        log_error "部署失败！"
        exit 1
    fi
}

# 信号处理
cleanup() {
    log_info "正在停止服务器..."
    if [ -n "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
    fi
    log_success "服务器已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 执行主函数
main "$@"