# CloudBase 策略更新指南

## 方式一：导入策略 JSON 文件（推荐）

### 1. 访问策略管理页面

https://console.cloud.tencent.com/cam/policy

### 2. 创建新策略

1. 点击「新建自定义策略」
2. 选择「按策略语法创建」
3. 选择「空白模板」或「模板」
4. 切换到「策略语法」模式

### 3. 导入策略 JSON

选择以下文件之一导入：

#### 选项 A：仅限当前环境（推荐，更安全）

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcb:DescribeEnvList",
        "tcb:DescribeEnvInfo",
        "tcb:CreateCloudBaseProject",
        "tcb:DescribeCloudBaseRunVersion",
        "tcb:DescribeCloudBaseRunServers",
        "tcb:ModifyCloudBaseRunServerFlowConf",
        "tcb:DescribeUploadTask",
        "tcb:CreateUploadTask",
        "tcb:CreateHostingDomain",
        "tcb:DescribeDomains",
        "tcb:ModifyHostingDomain",
        "tcb:DeleteHostingDomain",
        "tcb:DescribeHostingFiles",
        "tcb:ModifyWebsiteStatus",
        "tcb:ModifyWebsitePath",
        "tcb:DescribeHostingConfig",
        "tcb:ModifyWebsiteConfig",
        "tcb:DescribeQuota",
        "tcb:ModifyQuota",
        "tcb:CreateCloudBaseRunServerVersion",
        "tcb:DeleteCloudBaseRunServerVersion",
        "tcb:DescribeCloudBaseRunServerVersionList",
        "tcb:ModifyCloudBaseRunServerVersion",
        "tcb:CreateCloudBaseRunServerDeployment",
        "tcb:DescribeCloudBaseRunServerDeployments",
        "tcb:DeleteCloudBaseRunServerDeployment",
        "tcb:DeleteCloudBaseRunServer",
        "tcb:RollBackCloudBaseRunServerVersion",
        "tcb:ModifyCloudBaseRunServer",
        "tcb:DescribeCloudBaseRunServerList",
        "tcb:CreateCloudBaseRunServer",
        "tcb:StopCloudBaseRunServer",
        "tcb:StartCloudBaseRunServer",
        "tcb:DescribeEdgeLog",
        "tcb:DescribeEdgeOneTask",
        "tcb:CreateEdgeOneTask",
        "tcb:DeleteEdgeOneTask"
      ],
      "resource": [
        "qcs::tcb:*:uin/250406199:envId/python-5grw4lthed1f3e55"
      ],
      "effect": "allow"
    }
  ]
}
```

资源限制：仅限 `python-5grw4lthed1f3e55` 环境

**注意**：已将 `tcb:DescribeCloudBaseEnvs` 替换为正确的权限 `tcb:DescribeEnvList` 和 `tcb:DescribeEnvInfo`

#### 选项 B：全部资源（更灵活）

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcb:DescribeEnvList",
        "tcb:DescribeEnvInfo",
        "tcb:CreateCloudBaseProject",
        "tcb:DescribeCloudBaseRunVersion",
        "tcb:DescribeCloudBaseRunServers",
        "tcb:ModifyCloudBaseRunServerFlowConf",
        "tcb:DescribeUploadTask",
        "tcb:CreateUploadTask",
        "tcb:CreateHostingDomain",
        "tcb:DescribeDomains",
        "tcb:ModifyHostingDomain",
        "tcb:DeleteHostingDomain",
        "tcb:DescribeHostingFiles",
        "tcb:ModifyWebsiteStatus",
        "tcb:ModifyWebsitePath",
        "tcb:DescribeHostingConfig",
        "tcb:ModifyWebsiteConfig",
        "tcb:DescribeQuota",
        "tcb:ModifyQuota",
        "tcb:CreateCloudBaseRunServerVersion",
        "tcb:DeleteCloudBaseRunServerVersion",
        "tcb:DescribeCloudBaseRunServerVersionList",
        "tcb:ModifyCloudBaseRunServerVersion",
        "tcb:CreateCloudBaseRunServerDeployment",
        "tcb:DescribeCloudBaseRunServerDeployments",
        "tcb:DeleteCloudBaseRunServerDeployment",
        "tcb:DeleteCloudBaseRunServer",
        "tcb:RollBackCloudBaseRunServerVersion",
        "tcb:ModifyCloudBaseRunServer",
        "tcb:DescribeCloudBaseRunServerList",
        "tcb:CreateCloudBaseRunServer",
        "tcb:StopCloudBaseRunServer",
        "tcb:StartCloudBaseRunServer",
        "tcb:DescribeEdgeLog",
        "tcb:DescribeEdgeOneTask",
        "tcb:CreateEdgeOneTask",
        "tcb:DeleteEdgeOneTask"
      ],
      "resource": [
        "*"
      ],
      "effect": "allow"
    }
  ]
}
```

资源限制：无限制，可以访问所有 CloudBase 资源

**注意**：已将 `tcb:DescribeCloudBaseEnvs` 替换为正确的权限 `tcb:DescribeEnvList` 和 `tcb:DescribeEnvInfo`

### 4. 保存策略

1. 给策略命名，例如：`CloudBaseStaticHostingDeploy`
2. 点击「完成」

## 方式二：使用策略生成器（可视化界面）

### 1. 访问策略管理页面

https://console.cloud.tencent.com/cam/policy

### 2. 创建新策略

1. 点击「新建自定义策略」
2. 选择「按策略生成器创建」

### 3. 配置策略

**服务选择**：`云开发 CloudBase`

**操作选择**（按住 Shift 多选或逐个勾选）：

✅ `DescribeEnvList` - **这是关键！**
✅ `DescribeEnvInfo`
✅ `CreateCloudBaseProject`
✅ `DescribeCloudBaseRunVersion`
✅ `DescribeCloudBaseRunServers`
✅ `ModifyCloudBaseRunServerFlowConf`
✅ `DescribeUploadTask`
✅ `CreateUploadTask`
✅ `CreateHostingDomain`
✅ `DescribeDomains`
✅ `ModifyHostingDomain`
✅ `DeleteHostingDomain`
✅ `DescribeHostingFiles`
✅ `ModifyWebsiteStatus`
✅ `ModifyWebsitePath`
✅ `DescribeHostingConfig`
✅ `ModifyWebsiteConfig`
✅ `DescribeQuota`
✅ `ModifyQuota`
✅ `CreateCloudBaseRunServerVersion`
✅ `DeleteCloudBaseRunServerVersion`
✅ `DescribeCloudBaseRunServerVersionList`
✅ `ModifyCloudBaseRunServerVersion`
✅ `CreateCloudBaseRunServerDeployment`
✅ `DescribeCloudBaseRunServerDeployments`
✅ `DeleteCloudBaseRunServerDeployment`
✅ `DeleteCloudBaseRunServer`
✅ `RollBackCloudBaseRunServerVersion`
✅ `ModifyCloudBaseRunServer`
✅ `DescribeCloudBaseRunServerList`
✅ `CreateCloudBaseRunServer`
✅ `StopCloudBaseRunServer`
✅ `StartCloudBaseRunServer`
✅ `DescribeEdgeLog`
✅ `DescribeEdgeOneTask`
✅ `CreateEdgeOneTask`
✅ `DeleteEdgeOneTask`

**注意**：请勿选择 `DescribeCloudBaseEnvs`，该权限不存在。正确的权限是 `DescribeEnvList` 和 `DescribeEnvInfo`。

**资源选择**：
- 方案 A：`qcs::tcb:*:uin/250406199:envId/python-5grw4lthed1f3e55`（仅限当前环境）
- 方案 B：`*`（全部资源）

### 4. 保存策略

1. 给策略命名，例如：`CloudBaseStaticHostingDeploy`
2. 点击「完成」

## 将策略授权给子账号

### 1. 访问用户管理

https://console.cloud.tencent.com/cam/user

### 2. 找到子账号

1. 在用户列表中找到你的子账号
2. 点击「用户名称」或「操作」→「授权」

### 3. 添加策略

1. 在策略列表中搜索刚创建的策略 `CloudBaseStaticHostingDeploy`
2. 勾选该策略
3. 点击「确定」

## 验证权限

授权完成后，再次运行 GitHub Actions，应该可以正常部署了。

查看 GitHub Actions 日志：
https://github.com/jyz0501/jetour-adb-tool-v2/actions

## 注意事项

1. **主账号 UIN**：`250406199` - 这是你账号的唯一标识
2. **环境 ID**：`python-5grw4lthed1f3e55` - 这是 CloudBase 环境的唯一标识
3. **资源路径格式**：`qcs::tcb:*:uin/主账号UIN:envId/环境ID`
4. 如果使用主账号密钥，不需要配置策略，直接使用即可

## 文件说明

项目目录下已生成两个策略文件：

- `tcb-policy.json` - 仅限当前环境的策略
- `tcb-policy-all-resources.json` - 全部资源的策略
- `UPDATE_POLICY.md` - 本说明文档
