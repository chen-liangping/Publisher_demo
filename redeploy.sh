#!/bin/bash

# 产品原型重新部署脚本
# 用途：停止当前服务，重新启动开发环境，并启动 stagewise 工具
# 作者：产品经理学前端系列

echo "🚀 开始重新部署产品原型..."
echo "================================"

# 1. 停止现有的 Next.js 开发服务器
echo "📦 停止现有的开发服务器..."
pkill -f "next dev" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 已停止现有的 Next.js 服务器"
else
    echo "ℹ️  没有运行中的 Next.js 服务器"
fi

# 2. 停止现有的 stagewise 进程
echo "🛠️  停止现有的 stagewise 进程..."
pkill -f "stagewise" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 已停止现有的 stagewise 进程"
else
    echo "ℹ️  没有运行中的 stagewise 进程"
fi

# 3. 等待进程完全停止
echo "⏳ 等待进程完全停止..."
sleep 2

# 4. 检查项目文件结构
echo "📁 检查项目文件结构..."
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 不存在，请检查项目目录"
    exit 1
fi

if [ -f "stagewise.json" ]; then
    echo "✅ stagewise.json 配置文件存在"
else
    echo "⚠️  stagewise.json 不存在，将在首次运行时创建"
fi

# 5. 启动 Next.js 开发服务器（后台运行）
echo "🔄 启动 Next.js 开发服务器..."
npm run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!

# 6. 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 5

# 7. 检查 Next.js 服务器是否正常运行
echo "🔍 检查服务器状态..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Next.js 服务器运行正常 (http://localhost:3000)"
else
    echo "❌ Next.js 服务器启动失败"
    echo "📋 查看日志："
    tail -10 /tmp/nextjs.log
    exit 1
fi

# 8. 确认进程状态
NEXT_PROCESS=$(ps aux | grep "next dev" | grep -v grep)
if [ ! -z "$NEXT_PROCESS" ]; then
    echo "✅ Next.js 进程运行中"
    echo "   PID: $(echo $NEXT_PROCESS | awk '{print $2}')"
else
    echo "❌ Next.js 进程未找到"
    exit 1
fi

# 9. 启动 stagewise 工具（后台运行）
echo "🛠️  启动 stagewise 工具..."
stagewise --app-port 3000 --port 3100 > /tmp/stagewise.log 2>&1 &
STAGEWISE_PID=$!

# 10. 等待 stagewise 启动
echo "⏳ 等待 stagewise 工具启动..."
sleep 3

# 11. 显示部署结果
echo ""
echo "🎉 重新部署完成！"
echo "================================"
echo "📱 应用地址：http://localhost:3000"
echo "🛠️  Stagewise 工具：http://localhost:3100"
echo ""
echo "📊 进程信息："
echo "   Next.js PID: $NEXTJS_PID"
echo "   Stagewise PID: $STAGEWISE_PID"
echo ""
echo "📋 日志文件："
echo "   Next.js: /tmp/nextjs.log"
echo "   Stagewise: /tmp/stagewise.log"
echo ""
echo "🔧 使用说明："
echo "   1. 打开浏览器访问 http://localhost:3000"
echo "   2. 使用 stagewise 工具栏选择页面元素"
echo "   3. 通过自然语言描述修改界面"
echo ""
echo "⚠️  注意：如需停止服务，请运行："
echo "   pkill -f 'next dev'"
echo "   pkill -f 'stagewise'"
echo ""
echo "✅ 部署脚本执行完成！"