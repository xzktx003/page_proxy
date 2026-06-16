# 仓库级 Bug 记忆

| 日期 | 问题 | 关键结论 |
|------|------|----------|
| 2026-06-10 | 添加服务后打开嵌入页空白 | 检查端口冲突、SPA fallback 缓存头和代理错误处理。`http-proxy-middleware` v2 要使用 `onError`/`onProxyRes` 等顶层回调，`on: { error }` 不会按预期接管错误页面。 |
| 2026-06-10 | 新增的 Vite/React 类服务代理后打不开 | 目标 HTML/JS/CSS 里的根相对资源必须在代理响应层改写为 `/<slug>/...`；只做请求转发会让浏览器请求代理根路径，导致 iframe 空白。 |
| 2026-06-10 | `coding kanban` 代理首屏可取但运行时仍异常 | 不要改写 JSON 业务响应；需要覆盖 JS 模板字符串里的 `${apiBaseUrl}/api`、`${wsBase()}/ws`，并在 Node server 上显式处理 WebSocket upgrade。 |
| 2026-06-11 | Playwright 复现 `/36ef74bf` 空白和主服务过一会儿崩溃 | Vite dev 服务通过二级路径代理时可禁用 HMR client；JS 重写不能匹配任意 `"/..."`，否则会破坏正则字面量；WebSocket 错误处理不能假设 `res.writeHead` 存在。 |
| 2026-06-11 | 点击非根路径服务卡片后命中目标根路径并返回 Unauthorized | 为服务增加 `entryPath` 默认访问路径；卡片嵌入与分享链接按 `/<slug><entryPath>` 打开，例如 `/debug-proxies/ui/#/proxies`。 |
| 2026-06-11 | mihomo/yacd 这类子路径 UI 在 iframe 内操作失效 | 除设置 `entryPath=/ui/` 外，还要处理 iframe 内根路径 API 请求；按 Referer 中的 `/<slug>/...` 将 `/configs`、`/proxies`、`/api/*` 等根 API 转发回对应目标服务。 |
| 2026-06-11 | 代理访问和直连访问的浏览器配置不一致 | 浏览器 localStorage 按 origin 隔离，`9090` 和 `39197` 无法共享 yacd 的 `yacd.haishan.me` 配置；需要复用直连状态的服务应使用 `openMode=direct`。 |
| 2026-06-11 | 禁用 Vite HMR 后页面内容出现但样式丢失 | Vite CSS 模块依赖 `/@vite/client` 导出的 `updateStyle()` 注入样式；HMR shim 不能把该函数留空，需要维护 `style[data-vite-dev-id]`。 |
| 2026-06-12 | UI 修改服务配置始终失败，改 HTTPS 也无效 | services router 缺少 `express.json()` 导致 POST/PUT 的 `req.body` 为 undefined；健康检查始终用 `http.request()` 不支持 HTTPS；HTTPS 代理和健康检查需加 `rejectUnauthorized: false` 和 `secure: false` |
| 2026-06-13 | Page Proxy 里 `coding kanban` 打不开 | 目标 8484 端口是 HTTPS，不是 HTTP；配置协议错误会让健康检查离线并触发代理 `ECONNRESET`。将服务配置改为 `protocol=https` 后，`http://10.30.0.22:9999/36ef74bf` 经 Playwright 验证可加载 `Agent Orchestrator`。 |
