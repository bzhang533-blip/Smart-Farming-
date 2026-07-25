# Frontend Requests

> Backend-owned coordination file for frontend changes.
> When backend work reveals a frontend change, document it here instead of editing frontend code directly.

---

## Active Requests

*（暂无。）*

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

### [2026-06-13, completed 2026-07-14] Migrate crop key from `soybean` to canonical `soybeans`

**Context**：The v1 alignment contract in `docs/v1-alignment.md` defines `CropKey = "corn" | "soybeans" | "other"`. Current frontend code still uses `soybean` in types/config/mock data. The backend now accepts only canonical `soybeans`; the temporary `soybean` compatibility alias has been removed.

**Requested frontend change**：
- [x] Update frontend crop type/config/mock data from `soybean` to `soybeans`
- [x] Align cost/default/scenario payloads with `docs/v1-alignment.md` (`Scenario`, `CropEntry`, `CostLine`)
- [x] Remove any dependency on the old backend `soybean` compatibility alias

**Backend/API notes**：
- Endpoint: `GET /defaults`, `/scenarios`, `/scenarios/:id`
- Request shape: `crop` must use canonical `soybeans`; backend rejects `soybean`
- Response shape: backend returns/stores canonical `soybeans`
- Status: 完成

**Acceptance criteria**：
- [x] Frontend sends and handles `soybeans` consistently
- [x] No frontend code requires the backend `soybean` alias
