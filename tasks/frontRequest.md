# Frontend Requests

> Backend-owned coordination file for frontend changes.
> When backend work reveals a frontend change, document it here instead of editing frontend code directly.

---

## Active Requests

### [2026-06-13] Migrate crop key from `soybean` to canonical `soybeans`

**Context**：The v1 alignment contract in `docs/v1-alignment.md` defines `CropKey = "corn" | "soybeans" | "other"`. Current frontend code still uses `soybean` in types/config/mock data. The backend temporarily accepts both `soybean` and `soybeans`, but stores and returns `soybeans` as canonical.

**Requested frontend change**：
- [ ] Update frontend crop type/config/mock data from `soybean` to `soybeans`
- [ ] Align cost/default/scenario payloads with `docs/v1-alignment.md` (`Scenario`, `CropEntry`, `CostLine`)
- [ ] Remove dependency on the temporary backend `soybean` compatibility alias after migration

**Backend/API notes**：
- Endpoint: `GET /defaults`, `/scenarios`, `/scenarios/:id`
- Request shape: `crop` accepts `soybeans` canonical; backend also accepts `soybean` temporarily
- Response shape: backend returns/stores canonical `soybeans`
- Status: TODO: 待前端确认

**Acceptance criteria**：
- [ ] Frontend sends and handles `soybeans` consistently
- [ ] No frontend code requires the backend `soybean` alias

---

## Request Template

```markdown
### [YYYY-MM-DD] Request title

**Context**：Why the frontend change is needed.

**Requested frontend change**：
- [ ] Change 1
- [ ] Change 2

**Backend/API notes**：
- Endpoint:
- Request shape:
- Response shape:
- Status: TODO: 待前端确认

**Acceptance criteria**：
- [ ] User-visible behavior or testable outcome
```

---

## Completed Requests

*（暂无已完成的前端请求。）*
