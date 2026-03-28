# 自动监控配置指南

本项目提供了两种自动监控方案，您可以根据需求选择：

## 方案 1：使用 GitHub Actions（推荐，免费）

GitHub Actions 可以定期调用 `/api/check` 端点，无需 Vercel Pro 订阅。

### 配置步骤：

#### 1. 在 GitHub 仓库中配置 Secrets

1. 进入您的 GitHub 仓库
2. 点击 **Settings** > **Secrets and variables** > **Actions**
3. 点击 **New repository secret** 添加以下 secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|---------|
| `SITE_URL` | 您的 Vercel 部署 URL | `https://your-app.vercel.app` |
| `CRON_SECRET` | 与 Vercel 中设置的相同值 | 使用 `openssl rand -hex 32` 生成 |

#### 2. 启用 GitHub Actions

1. 确保项目包含 `.github/workflows/monitor-check.yml` 文件（已包含在本项目中）
2. 将代码推送到 GitHub
3. GitHub Actions 会自动运行，默认每 5 分钟调用一次 `/api/check` 端点

#### 3. 检查运行状态

1. 进入 GitHub 仓库的 **Actions** 标签页
2. 查看 "Uptime Monitor Cron" workflow 的执行历史
3. 可以点击具体的运行查看详细日志

#### 4. 自定义检查频率

如果需要修改检查频率，编辑 `.github/workflows/monitor-check.yml` 文件：

```yaml
on:
  schedule:
    # 每 5 分钟运行一次
    - cron: '*/5 * * * *'
    # 改为每 1 分钟运行一次
    # - cron: '* * * * *'
    # 改为每 10 分钟运行一次
    # - cron: '*/10 * * * *'
```

修改后推送到 GitHub，新的频率会立即生效。

#### 优点：

- ✅ 完全免费（GitHub Actions 免费额度很充足）
- ✅ 不受 Vercel Cron 频率限制
- ✅ 可以通过 GitHub Actions 界面手动触发检查
- ✅ 可自定义检查频率（最小 1 分钟）
- ✅ 有详细的运行日志和历史记录

---

## 方案 2：使用外部 Cron 服务

如果不想使用 GitHub Actions，可以使用其他免费的外部 cron 服务。

### 推荐服务：

1. **cron-job.org**（免费）
   - 网址：https://cron-job.org/
   - 免费账户支持最多 60 个 cron 任务
   - 最小间隔：1 分钟

2. **EasyCron**（免费额度）
   - 网址：https://www.easycron.com/
   - 免费账户支持一定数量的 cron 任务
   - 提供执行日志和失败重试

### 配置步骤（以 cron-job.org 为例）：

1. 注册并登录 cron-job.org
2. 点击 **Create cronjob**
3. 配置如下：
   - **Title**: Uptime Monitor Check
   - **URL**: `https://your-app.vercel.app/api/check`
   - **Method**: POST
   - **Execution**: Every 1 minute
   - **Authentication**:
     - Header Name: `Authorization`
     - Header Value: `Bearer YOUR_CRON_SECRET`
4. 保存并激活

### curl 命令测试：

```bash
curl -X POST https://your-app.vercel.app/api/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 方案 3：使用 Vercel Cron

如果您有 Vercel Pro 订阅，可以使用 Vercel Cron。

### 配置步骤：

1. 修改 `vercel.json` 文件：
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "* * * * *"
    }
  ]
}
```

2. 提交并推送到 GitHub

### 限制说明：

- Vercel **Hobby**（免费）计划：最小间隔为每天一次
- Vercel **Pro** 或 **Enterprise**：可以每分钟运行
- 需要在 Vercel 环境变量中设置 `CRON_SECRET`

---

## API 端点说明

### `/api/check` 端点

这是自动监控的核心端点，可以由任何外部 cron 服务调用。

**方法**：GET 或 POST

**响应示例**：
```json
{
  "success": true,
  "message": "Checked 3 monitor(s)",
  "checked": 3,
  "errors": 0
}
```

**安全性**：
- 开发环境：允许无认证调用
- 生产环境：需要 `CRON_SECRET` 环境变量保护
- 请求头：`Authorization: Bearer YOUR_CRON_SECRET`

**工作原理**：
1. 获取所有活跃监控（`is_active = true`）
2. 检查每个监控是否到达检查时间
3. 只检查那些距离上次检查时间超过设定间隔的监控
4. 记录检查结果到数据库
5. 自动处理故障事件和恢复通知

---

## 常见问题

### Q: 推荐使用哪个方案？

**A:** 推荐使用 **GitHub Actions**（方案 1），因为：
- 完全免费
- 配置简单
- 与代码库集成
- 有详细的日志

### Q: 如何验证自动监控是否正常工作？

**A:** 检查以下内容：
1. 查看数据库 `check_results` 表，应该有新的检查记录
2. 查看 GitHub Actions 运行日志，应该显示 "Checked X monitor(s)"
3. 查看仪表板，监控状态应该定期更新

### Q: 如何停止自动监控？

**A:** 根据使用的方案：
- GitHub Actions：删除 `.github/workflows/monitor-check.yml` 或在 GitHub Actions 中禁用
- 外部 cron 服务：在相应服务的控制台中暂停或删除任务
- Vercel Cron：修改 `vercel.json`，移除 cron 配置

### Q: 可以同时使用多种方案吗？

**A:** 可以，但**不推荐**。同时运行多个 cron 服务会导致重复检查，增加数据库负载和成本。请选择一种方案使用。

---

## 支持

如果遇到问题，请检查：
1. 确认 `CRON_SECRET` 环境变量已设置
2. 检查监控的 `is_active` 字段为 `true`
3. 查看对应的日志（GitHub Actions 或外部 cron 服务）
4. 测试 API 端点是否可以正常访问

