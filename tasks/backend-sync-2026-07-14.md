# 后端同步:生产环境已上线 + 待办事项(2026-07-14)

> 写给后端(Dart)同学。今天 v1 已部署到生产:自有域名 + 全链路 HTTPS + Clerk 生产实例 + 三个自启服务。
> 本文档同步:① 生产架构现状;② 与后端直接相关的事实;③ 需要你处理/决策的事项。

---

## 1. 生产架构一览

```
浏览器 ── https://app.smartfarms.cc ──┐
                                     ├── Caddy(443,自动 TLS)── localhost:3000  Next.js(next start)
浏览器 ── https://api.smartfarms.cc ──┘                      └─ localhost:8080  Python backend
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
   # requirements 有变时，在项目 Python venv 中执行:
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   Restart-Service smartfarm-backend
   Get-Content C:\smart_farm\logs\backend.err.log -Tail 20   # 看启动报错
   ```

## 3. 请你处理的事项(按优先级)

1. **[已处理 2026-07-25] Clerk JWKS 默认值**:`backend/backend.py` 默认使用
   `https://clerk.smartfarms.cc/.well-known/jwks.json`，仍可用 `CLERK_JWKS_URL` 覆盖。
2. **[部分处理 2026-07-25] `backend/data/` 备份策略**:仓库提供原子 ZIP 备份命令，
   需要在 Windows 计划任务中定时执行，并把目标设到异机/同步盘：
   ```powershell
   C:\smart_farm\.venv\Scripts\python.exe C:\smart_farm\backend\backup.py `
     --destination D:\smart-farm-backups
   ```
   备份命令会先解析验证 JSON，再原子生成带 UTC 时间戳的 ZIP。仍需配置 Azure VM 备份或
   将目标目录同步到 VM 外，并实际演练恢复。
3. **[已处理 2026-07-25] API 契约**:`tasks/api-contracts.md` 已与实际
   `directCosts: CostLine[]` + `landCostPerAcre` + `machineryCostPerAcre` 对齐。
4. **[已处理 2026-07-25] CORS**:Python 后端默认仅允许
   `https://app.smartfarms.cc`，可用逗号分隔的 `SMART_FARM_ALLOWED_ORIGINS` 覆盖。

5. **[仍需运维处理] 异机备份**:代码已使用临时文件 + 原子替换，并把每次
   read-modify-write 放入同一进程锁；仍需在 Azure/Windows 配置异机定时执行上述命令和恢复演练。

## 4. FYI(不需要动作)

- 前端 v1 审计缺口 2–5 已修复并合并(PR #11);缺口 1(保本单产展示)按之前的共同决定保持隐藏。
  详见 `tasks/status-2026-07-14.md` 与 `tasks/todo.md` 审查小结。
- `PUT /scenarios/:id` 你已实现、前端暂未接(v1 契约里标 optional,用删+建代替)。
- 前端 `.env.local`(含 sk_live)只存在 VM 上,未入库;`NEXT_PUBLIC_*` 是构建期固化,改配置要
  `Stop-Service smartfarm-frontend → npm run build → Start-Service`。
