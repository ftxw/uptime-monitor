# Uptime Monitor

> 本项目基于 [Website-Uptime-Monitor-template](https://github.com/bseymour/Website-Uptime-Monitor-template)，通过 AI 改造优化，支持 Vercel 和 EdgeOne 两种部署方式。

一个自托管的网站可用性监控工具，使用 Next.js 16 构建，监控您的网站和 API，追踪响应时间和 SSL 证书，在服务宕机时接收邮件告警，并在整洁的仪表板中查看所有信息。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/uptime-monitor&env=DATABASE_URL,NEXT_PUBLIC_VERCEL_APP_CLIENT_ID,VERCEL_APP_CLIENT_SECRET,ALLOWED_EMAILS,CRON_SECRET&envDescription=Configuration%20for%20Uptime%20Monitor&envLink=https://github.com/your-username/uptime-monitor%23complete-setup-guide)

## ✨ 特性

- **端点监控** - 添加任何 HTTP/HTTPS 端点，支持可配置的检查间隔（5 分钟到 24 小时）、HTTP 方法（GET/HEAD/POST）、预期状态码和超时阈值
- **分类组织** - 将监控整理到自定义分类中（如"Web 服务"、"API"、"数据库"）。添加或编辑监控时可直接创建分类
- **SSL 证书追踪** - 自动检查 HTTPS 端点的 SSL 证书有效性和过期时间。当证书剩余少于 14 天时标记为"降级"
- **响应时间图表** - 使用 Recharts 绘制面积图，可视化响应时间历史，展示性能趋势
- **可用率历史条** - 紧凑的 30 段颜色条，一目了然地显示最近的检查状态（绿色=正常，红色=宕机，琥珀色=降级）
- **事件管理** - 监控宕机时自动创建事件，恢复时自动解决。完整的事件历史记录及时间戳
- **邮件告警** - 使用 Resend 发送"宕机"和"恢复"邮件通知。所有告警都记录到数据库中
- **手动检查** - 仪表板上的"立即全部检查"按钮和单个监控的"运行检查"按钮，按需触发检查
- **自动定时检查** - 通过外部 cron 服务按计划运行（默认：每 5 分钟），根据配置的间隔检查到期的监控
- **简单密码认证** - 使用环境变量设置的管理员密码进行身份验证，无需 OAuth

## 🛠 技术栈

| 层级         | 技术                                     |
|---------------|------------------------------------------|
| 框架         | Next.js 16 (App Router)                 |
| 数据库       | Neon (Serverless PostgreSQL)            |
| 认证         | Sign In with Vercel (OAuth 2.0 PKCE)   |
| 告警         | Resend (邮件 API)                       |
| UI           | shadcn/ui, Tailwind CSS, Recharts       |
| 数据获取     | SWR (客户端), 服务端通过 Neon driver    |
| 部署         | Vercel / EdgeOne                        |

## 🚀 快速开始

### 选项一：Vercel 部署（推荐）

1. 点击上方 **"Deploy with Vercel"** 按钮
2. 按照下面的设置步骤配置服务
3. 部署将引导您连接 GitHub 仓库

### 选项二：EdgeOne 部署

EdgeOne 是腾讯云的边缘网络产品，适合部署在中国区的项目。

1. **准备代码仓库**
   - 将项目推送到 GitHub
   - 确保代码仓库为公开（或设置适当的访问权限）

2. **创建 EdgeOne 应用**
   - 访问 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
   - 选择"静态网站托管"或"Serverless 应用"
   - 导入 GitHub 仓库

3. **配置环境变量**（与 Vercel 相同，见下方步骤）

4. **部署**
   - 点击部署，等待构建完成
   - 获取访问域名

### 选项三：手动设置

1. 克隆此仓库
2. 推送到您的 GitHub 账户
3. 导入到 Vercel 或 EdgeOne
4. 按照下面的设置步骤配置服务

## 📋 完整设置指南

本指南将引导您完成所有必需服务的设置和应用程序配置。

### 前置条件

开始之前，请确保您有：
- 一个 [Vercel](https://vercel.com) 账户（免费版可用）或 [腾讯云 EdgeOne](https://console.cloud.tencent.com/edgeone) 账户
- 一个 [Neon](https://neon.tech) 账户（免费版可用）
- 可选，一个 [Resend](https://resend.com) 账户用于邮件告警（免费版可用）

---

### 步骤 1：部署到 Vercel 或 EdgeOne

#### Vercel 部署

1. **导入项目**：
   - 如果使用模板：点击"Deploy"并选择您的 Vercel 账户
   - 如果手动部署：前往 [Vercel Dashboard](https://vercel.com/dashboard) > **Add New** > **Project** > 导入您的仓库

2. **初始部署**：Vercel 将部署您的项目，但在配置以下服务之前还不能工作。

#### EdgeOne 部署

1. **创建应用**：
   - 前往 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
   - 选择"应用" > "创建应用"
   - 选择"从 Git 仓库创建"

2. **导入仓库**：
   - 授权访问您的 GitHub
   - 选择 uptime-monitor 仓库

3. **配置构建设置**（通常自动检测）：
   - 构建命令：`npm run build` 或 `pnpm run build`
   - 输出目录：`.next`

---

### 步骤 2：设置 Neon 数据库

Neon 提供了一个与 Vercel 无缝协作的无服务器 PostgreSQL 数据库。

#### 选项 A：使用 Vercel Storage 集成（推荐）

1. 在您的 Vercel 项目仪表板中，转到 **Storage** 标签
2. 点击 **Create Database** > 选择 **Neon**
3. 为您的数据库选择一个名称（例如 "uptime-monitor-db"）
4. 选择一个靠近您的用户的区域
5. 点击 **Create**
6. Vercel 将自动为您设置 `DATABASE_URL` 环境变量

#### 选项 B：手动 Neon 设置

1. 前往 [Neon Console](https://console.neon.tech)
2. 点击 **Create Project**
3. 选择名称和区域
4. 复制您的连接字符串（看起来像：`postgresql://user:password@host.neon.tech/dbname`）
5. 在 Vercel/EdgeOne 中，转到 **Settings** > **Environment Variables** 并添加：
   - Key: `DATABASE_URL`
   - Value: 您的 Neon 连接字符串

#### 初始化数据库模式

1. 前往您的 Neon 仪表板并打开 **SQL Editor**
2. 从此仓库复制 `scripts/setup-database.sql` 的全部内容
3. 将其粘贴到 SQL Editor 中并点击 **Run**
4. 或者使用 Neon CLI：
   ```bash
   psql $DATABASE_URL -f scripts/setup-database.sql
   ```

您应该看到确认表和索引已创建的消息。

设置脚本将自动创建：
- **5 个表**：categories, monitors, check_results, incidents, alert_log
- **所有必要的索引**以优化查询性能

分类由用户在添加或编辑监控时创建。没有分类的监控将显示为"无分类"。

---

### 步骤 3：设置管理员密码

此应用程序使用简单的密码认证，无需 OAuth。您只需要设置一个管理密码。

1. **设置 ADMIN_PASSWORD 环境变量**：
   - 选择一个强密码（至少 8 个字符，包含字母、数字和特殊字符）
   - 您可以使用以下命令生成安全密码：
     ```bash
     openssl rand -base64 32
     ```
   - 将此密码添加到您的环境变量中（见下一步）

**注意**：密码保存在服务器端，通过 HTTP-only cookie 存储会话，安全性较高。

---

### 步骤 4：配置环境变量

在您的 Vercel 或 EdgeOne 项目仪表板中，转到 **Settings** > **Environment Variables** 并添加以下内容：

#### 必需变量

| 变量              | 描述                         | 如何获取                                       |
|-------------------|------------------------------|------------------------------------------------|
| `DATABASE_URL`    | Neon 数据库连接字符串         | 使用 Vercel Storage 时自动设置，或从 Neon 仪表板复制 |
| `ADMIN_PASSWORD`  | 管理员登录密码               | 使用 `openssl rand -base64 32` 生成或自定义   |
| `CRON_SECRET`     | 用于保护 cron 端点的密钥     | 使用 `openssl rand -hex 32` 或任何随机字符串生成 |

#### 可选变量（用于邮件告警）

| 变量              | 描述                         | 默认值                                  |
|-------------------|------------------------------|-----------------------------------------|
| `RESEND_API_KEY`  | 用于发送告警的 Resend API 密钥 | 仅在您想要邮件告警时需要                |
| `ALERT_EMAILS`    | 接收告警的电子邮件列表        | 仅在您想要邮件告警时需要                |
| `ALERT_FROM_EMAIL` | 告警邮件的"发件人"地址       | `Uptime Monitor <onboarding@resend.dev>` |

#### 开发变量

| 变量        | 描述                            | 默认值  |
|-------------|---------------------------------|---------|
| `BYPASS_AUTH` | 设置为 `true` 可在本地开发时跳过 OAuth | `false` |

**重要提示**：
- 确保根据需要为 **Production**、**Preview** 和 **Development** 环境添加这些变量
- 添加变量后，**重新部署**您的应用程序以使更改生效
- `ADMIN_PASSWORD` 应该是强密码，建议使用以下命令生成：
  ```bash
  openssl rand -base64 32
  ```
- `CRON_SECRET` 应该是一个长随机字符串，可以使用以下方法生成：
  ```bash
  openssl rand -hex 32
  ```

---

### 步骤 5：设置 Resend（可选 - 用于邮件告警）

如果您想在监控宕机时接收邮件告警，请设置 Resend：

1. **创建 Resend 账户**：
   - 前往 [resend.com](https://resend.com) 并注册（免费版可用）

2. **获取您的 API 密钥**：
   - 前往 [Resend Dashboard](https://resend.com/api-keys)
   - 点击 **Create API Key**
   - 为其命名（例如 "Uptime Monitor"）
   - 复制 API 密钥（以 `re_` 开头）

3. **验证您的域名**（推荐）：
   - 前往 [Resend Domains](https://resend.com/domains)
   - 添加您的域名并按照 DNS 验证步骤操作
   - 这允许您从自己的域名发送，而不是 `onboarding@resend.dev`

4. **添加到 Vercel/EdgeOne 环境变量**：
   - `RESEND_API_KEY`：您的 Resend API 密钥
   - `ALERT_EMAILS`：要通知的电子邮件逗号分隔列表（例如 `alerts@example.com,team@example.com`）
   - `ALERT_FROM_EMAIL`：您验证的域名电子邮件（例如 `Uptime Monitor <noreply@yourdomain.com>`）

**注意**：如果您跳过 Resend 设置，应用程序可以正常工作，但不会发送邮件告警。所有其他功能将正常运行。

---

### 步骤 6：配置自动检查

本项目推荐使用外部 cron 服务进行定时检查，这样可以：
- 在 Vercel 和 EdgeOne 都能正常工作
- 不受 Vercel Cron 的计划限制
- 更加灵活和可靠

#### 选项 A：cron-job.org（推荐，免费）

对于 EdgeOne 部署或需要更可靠定时任务的情况，使用外部 cron 服务：

**cron-job.org（推荐，免费）**

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

**注意事项**：
- 如果您的部署在中国区（EdgeOne 中国区），国外 cron 服务（如 cron-job.org）可能无法正常访问
- 建议使用国内的定时任务服务，如腾讯云云函数定时触发

#### 选项 B：腾讯云云函数定时触发（EdgeOne 推荐）

1. 创建云函数
2. 配置定时触发器
3. 函数中调用 `/api/check` 端点

---

### 步骤 7：重新部署和测试

1. **重新部署您的应用程序**：
   - 前往您的 Vercel/EdgeOne 项目仪表板
   - 点击 **Deployments** > **Redeploy**（或推送新提交）
   - 等待部署完成

2. **测试设置**：
   - 访问您部署的 URL（例如 `https://your-app.vercel.app` 或 `https://your-domain.com`）
   - 您应该看到登录页面
   - 输入您设置的 `ADMIN_PASSWORD`
   - 如果密码正确，您将被重定向到仪表板
   - 点击 **Add Monitor** 添加您的第一个端点
   - 使用 **Check All Now** 触发立即检查

---

## 💻 本地开发

对于本地开发，您可以绕过 OAuth 流程：

1. **克隆仓库**：
   ```bash
   git clone <your-repo-url>
   cd uptime-monitor
   ```

2. **安装依赖**：
   ```bash
   pnpm install
   ```
   > **注意**：此项目使用 [pnpm](https://pnpm.io)。如果您没有安装 pnpm，可以使用 `npm install -g pnpm` 安装，或者使用 `npm install` 代替（尽管推荐 pnpm）。

3. **设置环境变量**：
   - 将 `.env.example` 复制到 `.env.local`
   - 填写您的值（至少需要 `DATABASE_URL` 和 `ADMIN_PASSWORD`）
   - 设置 `BYPASS_AUTH=true` 以跳过密码验证（仅开发环境）

4. **运行开发服务器**：
   ```bash
   pnpm dev
   ```
   > **注意**：如果使用 npm，使用 `npm run dev` 代替。

5. **访问应用程序**：
   - 打开 [http://localhost:3000](http://localhost:3000)
   - 使用 `BYPASS_AUTH=true`，您将自动登录（无需密码）
   - 否则，输入 `ADMIN_PASSWORD` 登录

---

## 🔧 故障排除

### 访问应用程序时出现"Unauthorized"错误

- 检查 `ADMIN_PASSWORD` 环境变量是否已设置
- 确认输入的密码与 `ADMIN_PASSWORD` 完全一致
- 检查是否在正确的环境（Production/Preview/Development）中设置了密码

### 数据库连接错误

- 验证 `DATABASE_URL` 在 Vercel/EdgeOne 环境变量中设置正确
- 检查您是否已运行数据库设置脚本（`scripts/setup-database.sql`）
- 确保您的 Neon 数据库处于活动状态（未暂停）

### Cron 作业未运行

- 检查 `CRON_SECRET` 是否在环境变量中设置
- 验证外部 cron 服务配置是否正确
- 检查 cron 服务的执行日志

### 对于 EdgeOne 部署的 cron 问题

- 检查外部 cron 服务是否可以访问您的域名
- 如果使用 cron-job.org 且部署在中国区，考虑使用国内 cron 服务
- 验证 `CRON_SECRET` 和 Authorization header 是否正确

### 邮件告警未发送

- 验证 `RESEND_API_KEY` 设置正确
- 检查 `ALERT_EMAILS` 是否包含有效的电子邮件地址
- 确保您的 Resend 账户有可用额度
- 检查数据库中的 `alert_log` 表以获取错误消息

### "Missing required environment variable" 错误

- 查看上面的环境变量部分
- 确保所有必需的变量都在 Vercel/EdgeOne 中设置
- 添加新的环境变量后重新部署

---

## 📁 项目结构

```
app/
  api/
    auth/
      login/route.ts       # 密码登录接口
      signout/route.ts     # 清除会话
    categories/
      route.ts            # 分类 CRUD（列表/创建/删除）
    check/
      route.ts            # 外部 cron 端点（POST /api/check）
    dashboard/route.ts    # 聚合仪表板数据
    incidents/route.ts    # 事件历史
    monitors/
      route.ts             # 监控 CRUD（列表/创建）
      [id]/route.ts        # 单个监控（获取/更新/删除）
      [id]/check/route.ts  # 为一个监控触发手动检查
      [id]/checks/route.ts # 一个监控的检查结果历史
      check-all/route.ts   # 为所有监控触发手动检查
  dashboard/
    page.tsx               # 主仪表板页面（服务端组件）
    monitors/[id]/page.tsx # 监控详情页面（服务端组件）
  login/page.tsx           # 登录页面
  page.tsx                 # 根重定向

components/
  dashboard-view.tsx       # 主仪表板布局（客户端组件）
  monitor-table.tsx        # 带内联状态的监控列表
  stat-cards.tsx           # 摘要统计卡片
  status-badge.tsx         # 颜色编码的状态标签
  uptime-bar.tsx           # 可视化可用率历史条
  response-time-chart.tsx  # Recharts 响应时间面积图
  add-monitor-dialog.tsx   # 添加监控的对话框表单（带分类创建）
  edit-monitor-dialog.tsx  # 编辑监控的对话框表单（带分类创建）
  category-manager.tsx      # 分类管理 UI

lib/
  auth.ts                  # 密码认证和会话管理
  checker.ts               # HTTP 检查 + SSL 证书检查逻辑
  alerts.ts                # 通过 Resend 的邮件告警系统
  db.ts                    # Neon 数据库客户端
  queries.ts               # 所有数据库查询
  types.ts                 # TypeScript 接口
  validation.ts            # 输入验证工具
  env.ts                   # 环境变量验证
  api.ts                   # API 工具函数
  constants.ts             # 常量定义
  utils.ts                 # 工具函数

scripts/
  setup-database.sql       # 数据库模式（表 + 索引）
```

---

## 🗄 数据库模式

应用程序使用五个表：

- **categories** - 监控分类用于组织（名称，创建时间）
- **monitors** - 端点配置（URL、方法、间隔、超时、预期状态、category_id）
- **check_results** - 单个检查结果（状态、响应时间、SSL 信息、错误）
- **incidents** - 带开始/解决时间戳的停机事件
- **alert_log** - 每个发送的告警的记录（频道、收件人、成功/失败）

所有表都使用 `gen_random_uuid()` 作为主键，并包含适当的索引以优化查询性能。级联删除确保删除监控会清理所有相关记录。

---

## 🔐 安全考虑

- **输入验证**：所有 URL 都经过验证以防止 SSRF 攻击（阻止私有 IP）
- **SQL 注入**：所有数据库查询都使用参数化查询
- **身份验证**：使用管理员密码认证，通过 HTTP-only cookie 存储会话
- **会话安全**：HTTP-only、安全 cookie 和 SameSite 保护
- **Cron 安全**：Cron 端点受 `CRON_SECRET` 承载令牌保护
- **密码安全**：建议使用强密码，定期更换

---

## 📄 许可证

MIT License - 可自由用于个人或商业目的。

---

## 🙏 致谢

本项目基于 [bseymour/Website-Uptime-Monitor-template](https://github.com/bseymour/Website-Uptime-Monitor-template)，并通过 AI 辅助改造优化，增加了对 EdgeOne 部署的支持和多项 UI/UX 改进。

**Made with ❤️ using Next.js, Neon, Vercel and EdgeOne**
