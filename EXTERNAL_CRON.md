# 外部 Cron 服务配置指南

由于 GitHub Actions 的 scheduled runs 存在不稳定的问题，建议使用以下免费的第三方 cron 服务来实现更可靠的自动检查。

## 方案一：Cron-Job.org（推荐，免费）

### 步骤：

1. 访问 https://cron-job.org 注册账号

2. 创建新的 cron job：
   - **Title**: Uptime Monitor
   - **URL**: `https://你的域名/api/check`
   - **Method**: POST
   - **Headers** (添加):
     - `Authorization: Bearer 你的CRON_SECRET值`
     - `Content-Type: application/json`
   - **Schedule**: 每 5 分钟运行
     - Cron 表达式: `*/5 * * * *`

3. 保存并启用

### 优点：
- ✅ 完全免费
- ✅ 调度非常稳定
- ✅ 支持自定义 headers
- ✅ 有详细的执行日志
- ✅ 支持 SSL/TLS

## 方案二：EasyCron

### 步骤：

1. 访问 https://www.easycron.com 注册账号（免费账号每月 300 次调用）

2. 创建 cron job：
   - **URL**: `https://你的域名/api/check`
   - **Method**: POST
   - **Headers**:
     - `Authorization: Bearer 你的CRON_SECRET值`
   - **Frequency**: Every 5 minutes

3. 保存

### 优点：
- ✅ 免费额度足够（300次/月）
- ✅ 界面友好
- ✅ 有执行日志
- ✅ 支持失败重试

## 方案三：GitHub Actions（备用）

如果坚持使用 GitHub Actions，请注意：

1. Scheduled runs 可能有延迟（最多迟到 10 分钟）
2. 需要推送代码后才会开始触发
3. 某些时候可能完全不触发（已知问题）

## API 端点说明

`POST /api/check`

**请求头**:
- `Authorization: Bearer <你的CRON_SECRET值>`
- `Content-Type: application/json`

**响应示例**:
```json
{
  "success": true,
  "message": "Checked 1 monitor(s)",
  "checked": 1,
  "errors": 0
}
```

## 测试 API 端点

你可以在浏览器或使用 curl 测试 API 是否正常：

```bash
curl -X POST https://你的域名/api/check \
  -H "Authorization: Bearer 你的CRON_SECRET值" \
  -H "Content-Type: application/json"
```

或者直接在浏览器访问（会返回 401，证明端点正常）：
```
https://你的域名/api/check
```

## 验证自动检查

配置完成后，监控的"上次检查"时间应该会自动更新。你可以在 Dashboard 页面查看监控的实时状态。
