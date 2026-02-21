#!/bin/bash

# Gitee Pages 部署脚本
# 使用方法: ./deploy-pages.sh

echo "开始部署到 Gitee Pages..."

# 检查是否在 master 分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "错误：请在 master 分支上运行此脚本"
    exit 1
fi

# 切换到 gh-pages 分支
echo "切换到 gh-pages 分支..."
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages

# 清空工作区并复制 master 分支内容
echo "更新 gh-pages 内容..."
rm -rf *
git checkout master -- .

# 提交更改
echo "提交更改..."
git add -A
git commit -m "Deploy to Gitee Pages - $(date +'%Y-%m-%d %H:%M:%S')" || echo "没有新的更改需要提交"

# 推送到远程
echo "推送到远程 gh-pages 分支..."
git push origin gh-pages --force

# 切回 master 分支
echo "切换回 master 分支..."
git checkout master

echo "部署完成！Gitee Pages 将在几分钟内自动构建。"
echo "访问地址: https://jinyz501.gitee.io/jetour_adb_tool"
