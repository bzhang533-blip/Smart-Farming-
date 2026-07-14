# 后端同步:生产环境已上线 + 待办事项(2026-07-14)

> 写给后端(Dart)同学。今天 v1 已部署到生产:自有域名 + 全链路 HTTPS + Clerk 生产实例 + 三个自启服务。
> 本文档同步:① 生产架构现状;② 与后端直接相关的事实;③ 需要你处理/决策的事项。

---

## 1. 生产架构一览

```
浏览器 ── https://app.smartfarms.cc ──┐
                                     ├── Caddy(443,自动 TLS)── localhost:3000  Next.js(next start)
浏览器 ── https://api.smartfarms.cc ──┘                      └─ localhost:8080  Dart backend
```

- **服务器**:Azure Windows Server VM,公网 IP `20.109.191.100`(静态),仓库在 `C:\smart_farm`(git,当前跑的是已合并进 main 的 `feat/frontend-ux-improvements`,PR #11)。
- **三个 Windows 服务**(NSSM 包装,开机自启,RDP 断连/注销/重启均不影响):
  `smartfarm-frontend` / `smartfarm-backend` / `smartfarm-caddy`,日志在 `C:\smart_farm\logs\`。
- **网络收口**:公网只开 80/443(Caddy);3000/8080 直连已关闭;22/3389 限管理员 IP。
- **DNS**:Cloudflare,所有记录 DNS-only(灰云)。Clerk 的 5 条 CNAME(clerk / accounts / clkmail / clk._domainkey / clk2._domainkey)已验证,SSL 已签发。

## 2. 与后端直接相关的事实

1. **Clerk 已切生产实例**。前端用 `pk_live/sk_live`;你的 JWT 验签数据源是
   `CLERK_JWKS_URL=https://clerk.smartfarms.cc/.well-known/jwks.json`
   (通过 `nssm set smartfarm-backend AppEnvironmentExtra` 注入,当前已配置)。
2. **生产用户库与 dev 完全隔离**:JWT `sub` 是全新的用户 id 空间,dev 里的测试数据/账号不迁移。
3. **`backend/data/` 现在存的是真实生产用户数据**(file-backed FarmStore / ScenarioStore),路径 `C:\smart_farm\backend\data\`。
4. **后端改动的上线流程**(VM PowerShell):
   ```powershell
   cd C:\smart_farm ; git pull
   # 若 pubspec 有变:C:\dart\dart-sdk\bin\dart pub get(在 backend\ 下执行)
   Restart-Service smartfarm-backend
   Get-Content C:\smart_farm\logs\backend.err.log -Tail 20   # 看启动报错
   ```

## 3. 请你处理的事项(按优先级)

1. **[P1] `CLERK_JWKS_URL` 默认值是个坑**:`src/auth.dart` 默认取
   `https://api.clerk.com/v1/jwks` —— 该端点需要 secret key 鉴权,而代码的 JWKS 请求不带任何
   Authorization,导致**不配置环境变量时所有登录请求 401**(部署时实测踩坑)。
   建议二选一:把默认值改为实例的 `.well-known/jwks.json` 公开端点,或在后端 README 里显著标注
   该环境变量为必配项。(后端代码归你,前端不动。)
2. **[P2] `backend/data/` 备份策略**:现在是单文件存储、单 VM、无备份。至少加一个定期拷贝
   (Azure VM 备份 / 计划任务复制到别处),并确认服务重启时的写入原子性(进程被 NSSM 杀掉重启
   是否可能截断写一半的 JSON)。
3. **[P3] `tasks/api-contracts.md` §1 已过时**:`GET /defaults` 的响应示例还是旧的
   `costItems`(`category`/`valuePerAcre`)格式,实际前后端都已用 `directCosts: CostLine[]` +
   `landCostPerAcre` + `machineryCostPerAcre`。新同学照文档接会做错,建议更新(契约文件是共有的,
   你改我对齐,或反之)。
4. **[P4,可选] CORS 收紧**:`http_utils.dart` 目前 `Access-Control-Allow-Origin: *`。
   生产域名固定后可收紧为 `https://app.smartfarms.cc`。

## 4. FYI(不需要动作)

- 前端 v1 审计缺口 2–5 已修复并合并(PR #11);缺口 1(保本单产展示)按之前的共同决定保持隐藏。
  详见 `tasks/status-2026-07-14.md` 与 `tasks/todo.md` 审查小结。
- `PUT /scenarios/:id` 你已实现、前端暂未接(v1 契约里标 optional,用删+建代替)。
- 前端 `.env.local`(含 sk_live)只存在 VM 上,未入库;`NEXT_PUBLIC_*` 是构建期固化,改配置要
  `Stop-Service smartfarm-frontend → npm run build → Start-Service`。
