# 📦 Page Proxy — 局域网服务统一代理工作台

通过唯一对外暴露的总端口，统一管理和代理访问局域网内多台机器上的 Web 服务，避免直接暴露内网地址与端口。实现一键切换、全屏无感知访问，地址栏始终保持总端口域名，无跳转泄露。

## 功能特性

- **服务管理**：添加、编辑、删除局域网 Web 服务，支持分组管理
- **卡片工作台**：响应式网格布局，在线/离线状态实时检测（每30秒）
- **全屏代理嵌入**：点击卡片进入全屏模式，地址栏不泄露内网信息
- **链接重写**：自动重写目标服务的 HTML/CSS 链接，确保代理透明
- **快捷操作**：为服务配置自定义操作按钮（重启、清空缓存等）
- **深色/浅色主题**：一键切换，状态持久化到 localStorage
- **拖拽排序**：卡片支持拖拽调整顺序
- **分享链接**：一键复制分享链接，可直接从公网访问

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Tailwind CSS + Axios |
| 后端 | Node.js + Express + http-proxy-middleware |
| 存储 | 本地 JSON 文件 (`config/services.json`) |

## 快速开始

### 前置要求

- Node.js 18+
- npm

### 一键启动

```bash
# 克隆项目后
chmod +x start.sh
./start.sh
```

### 手动启动

```bash
# 1. 安装后端依赖
cd apps/server && npm install

# 2. 安装前端依赖并构建
cd ../web && npm install && npm run build

# 3. 启动服务器
cd ../server && npm start
```

### 开发模式

```bash
# 终端1: 启动后端
cd apps/server && npm start

# 终端2: 启动前端开发服务器（支持热更新）
cd apps/web && npm run dev
```

## 访问地址

- 本机访问: `http://localhost:39197`
- 局域网访问: `http://<你的IP>:39197`

确保前端开发服务绑定 `0.0.0.0`（已默认配置），以便同网段设备访问。

## 配置说明

服务配置存储在 `config/services.json`，格式如下：

```json
{
  "services": [
    {
      "id": "uuid",
      "slug": "my-service",
      "name": "我的服务",
      "targetIp": "192.168.1.100",
      "targetPort": 8080,
      "protocol": "http",
      "healthCheckPath": "/",
      "color": "#3b82f6",
      "description": "服务描述",
      "group": "开发工具",
      "actions": [
        {
          "name": "重启",
          "method": "POST",
          "path": "/restart",
          "confirmPrompt": "确定要重启吗？"
        }
      ],
      "sort": 0,
      "online": true,
      "lastCheck": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## 代理路由

- 访问 `http://<总端口>/<服务标识>` → 全屏嵌入模式
- 访问 `http://<总端口>/<服务标识>/path` → 代理转发到目标服务
- 地址栏始终保持 `<总端口>/<服务标识>/...`，不暴露内网信息

## 公网部署

1. 在路由器上配置端口转发：将公网端口映射到 `http://<内网IP>:39197`
2. 如有域名，配置 DNS 解析指向公网 IP
3. 分享链接格式: `https://<公网域名>/<服务标识>`

## 目录结构

```
page_proxy/
├── config/
│   └── services.json          # 服务配置文件
├── apps/
│   ├── server/                # 后端 Express 服务
│   │   └── src/
│   │       ├── index.js       # 入口文件
│   │       ├── configStore.js # 配置管理
│   │       ├── healthCheck.js # 健康检查
│   │       └── routes/
│   │           ├── services.js # CRUD API
│   │           └── proxy.js   # 代理中间件
│   └── web/                   # 前端 Vue 3 应用
│       └── src/
│           ├── views/         # 页面视图
│           ├── components/    # UI 组件
│           └── api/           # API 接口
├── start.sh                   # 一键启动脚本
└── README.md
```

## License

MIT
