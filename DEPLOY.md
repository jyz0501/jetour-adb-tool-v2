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

#### 方式一：使用主账号密钥（推荐，简单）

1. 访问 [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 点击「新建密钥」或使用现有密钥
3. 记录 `SecretId` 和 `SecretKey`
4. 将这两个值分别填入 GitHub Secrets

#### 方式二：使用子账号密钥（需要配置权限）

1. 访问 [腾讯云访问管理](https://console.cloud.tencent.com/cam/user)
2. 创建或选择子账号
3. 配置以下权限（**必须包含全部权限**）：

**必要权限**：
- `tcb:DescribeEnvs` - 查看环境（必需）
- `tcb:CreateCloudBaseProject` - 创建项目
- `tcb:DescribeCloudBaseRunVersion` - 查看运行版本
- `tcb:DescribeCloudBaseRunServers` - 查看服务器
- `tcb:ModifyCloudBaseRunServerFlowConf` - 修改服务器配置
- `tcb:DescribeUploadTask` - 查看上传任务
- `tcb:CreateUploadTask` - 创建上传任务
- `tcb:CreateHostingDomain` - 创建托管域名
- `tcb:DescribeDomains` - 查看域名
- `tcb:ModifyHostingDomain` - 修改托管域名
- `tcb:DeleteHostingDomain` - 删除托管域名
- `tcb:DescribeHostingFiles` - 查看托管文件
- `tcb:ModifyWebsiteStatus` - 修改网站状态
- `tcb:ModifyWebsitePath` - 修改网站路径
- `tcb:DescribeHostingConfig` - 查看托管配置
- `tcb:ModifyWebsiteConfig` - 修改网站配置
- `tcb:DescribeQuota` - 查看配额
- `tcb:ModifyQuota` - 修改配额
- `tcb:CreateCloudBaseRunServerVersion` - 创建运行版本
- `tcb:DeleteCloudBaseRunServerVersion` - 删除运行版本
- `tcb:DescribeCloudBaseRunServerVersionList` - 查看运行版本列表
- `tcb:ModifyCloudBaseRunServerVersion` - 修改运行版本
- `tcb:CreateCloudBaseRunServerDeployment` - 创建部署
- `tcb:DescribeCloudBaseRunServerDeployments` - 查看部署
- `tcb:DeleteCloudBaseRunServerDeployment` - 删除部署
- `tcb:DeleteCloudBaseRunServer` - 删除服务器
- `tcb:RollBackCloudBaseRunServerVersion` - 回滚版本
- `tcb:ModifyCloudBaseRunServer` - 修改服务器
- `tcb:DescribeCloudBaseRunServerList` - 查看服务器列表
- `tcb:CreateCloudBaseRunServer` - 创建服务器
- `tcb:StopCloudBaseRunServer` - 停止服务器
- `tcb:StartCloudBaseRunServer` - 启动服务器
- `tcb:DescribeEdgeLog` - 查看边缘日志
- `tcb:DescribeEdgeOneTask` - 查看边缘任务
- `tcb:CreateEdgeOneTask` - 创建边缘任务
- `tcb:DeleteEdgeOneTask` - 删除边缘任务

**配置步骤**：
1. 访问 [策略管理](https://console.cloud.tencent.com/cam/policy)
2. 点击「新建自定义策略」
3. 选择「按策略生成器创建」
4. 服务选择「云开发 CloudBase」
5. 勾选上述所有权限
6. 资源选择「全部资源」或指定环境：`qcs::tcb:*:uin/250406199:envId/python-5grw4lthed1f3e55`
7. 将策略授权给子账号
8. 使用子账号的 SecretId 和 SecretKey 填入 GitHub Secrets

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
