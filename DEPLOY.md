name: Deploy to CloudBase Static Hosting

## 功能说明

此配置文件实现推送到 GitHub master 分支后自动部署到腾讯云 CloudBase 静态托管。

## 使用方法

### 1. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 点击 "New repository secret" 添加以下密钥：

| Secret 名称 | 值 | 获取方式 |
|------------|---|---------|
| `TCB_SECRET_ID` | 腾讯云 SecretId | https://console.cloud.tencent.com/cam/capi |
| `TCB_SECRET_KEY` | 腾讯云 SecretKey | https://console.cloud.tencent.com/cam/capi |

### 2. 获取腾讯云密钥

1. 访问 [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 点击「新建密钥」或使用现有密钥
3. 记录 `SecretId` 和 `SecretKey`
4. 将这两个值分别填入 GitHub Secrets

### 3. 触发部署

- **自动部署**：推送到 `master` 分支时自动触发
- **手动部署**：在 GitHub Actions 页面点击 "Run workflow"

### 4. 查看部署状态

访问 GitHub Actions 页面查看部署进度和日志。

### 5. 访问部署后的网站

部署完成后，访问 CloudBase 静态托管地址：
https://python-5grw4lthed1f3e55.tcb.qcloud.la

## 环境变量说明

- `TCB_ENV_ID`: CloudBase 环境ID（当前：`python-5grw4lthed1f3e55`）
- 如需更改环境ID，请修改 `.github/workflows/deploy.yml` 中的 `TCB_ENV_ID` 值

## 工作流程

1. 检出代码
2. 设置 Node.js 环境
3. 安装 CloudBase CLI
4. 使用密钥登录 CloudBase
5. 部署静态文件到 CloudBase 托管

## 注意事项

- 确保 CloudBase 静态网站服务已开启
- 确保密钥有 CloudBase 静态托管权限
- 首次部署可能需要等待 1-2 分钟
