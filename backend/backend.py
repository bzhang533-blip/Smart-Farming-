from __future__ import annotations

import argparse
import json
import math
import os
import re
import secrets
import sys
import threading
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, TypeVar
from urllib.parse import parse_qs, urlparse

import jwt


CANONICAL_CROPS = {"corn", "soybeans", "other"}
YIELD_BASES = {"aph", "expected"}
COST_SOURCES = {"default", "user"}
DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_CLERK_JWKS_URL = (
    "https://clerk.smartfarms.cc/.well-known/jwks.json"
)
DEFAULT_ALLOWED_ORIGINS = "https://app.smartfarms.cc"
T = TypeVar("T")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_crop(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized if normalized in CANONICAL_CROPS else None


def normalize_crop_keys(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize_crop_keys(item) for item in value]
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for raw_key, raw_value in value.items():
            key = str(raw_key)
            if key == "crop":
                result[key] = normalize_crop(raw_value) or raw_value
            else:
                result[key] = normalize_crop_keys(raw_value)
        return result
    return value


class JsonFileStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()

    def read(self) -> Any:
        with self._lock:
            if not self.path.exists():
                return None
            text = self.path.read_text(encoding="utf-8")
            return json.loads(text) if text.strip() else None

    def write(self, value: Any) -> None:
        with self._lock:
            self._write_unlocked(value)

    def update(self, mutator: Callable[[Any], tuple[Any, T]]) -> T:
        """Apply a complete read-modify-write transaction under one lock."""
        with self._lock:
            current = self._read_unlocked()
            updated, result = mutator(current)
            self._write_unlocked(updated)
            return result

    def _read_unlocked(self) -> Any:
        if not self.path.exists():
            return None
        text = self.path.read_text(encoding="utf-8")
        return json.loads(text) if text.strip() else None

    def _write_unlocked(self, value: Any) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(f"{self.path.suffix}.tmp")
        temporary.write_text(
            json.dumps(value, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.path)


class DefaultsRepository:
    def __init__(self, path: Path) -> None:
        self._store = JsonFileStore(path)

    def get_defaults(
        self, year: str | None, crop: str | None, region: str | None
    ) -> dict[str, Any]:
        data = self._store.read()
        if not isinstance(data, dict):
            raise RuntimeError("Defaults file must contain a JSON object.")
        response = deepcopy(data)
        if year is not None:
            try:
                requested_year = int(year)
            except ValueError as error:
                raise ValueError("Year must be an integer.") from error
            if requested_year != response.get("year"):
                raise ValueError("Defaults not found for year.")
        if region is not None and region.strip():
            response["region"] = region.strip()

        requested_crop = normalize_crop(crop)
        if crop is not None and requested_crop is None:
            raise ValueError("Unsupported crop.")
        if requested_crop is not None:
            crops = response.get("crops")
            if not isinstance(crops, dict) or requested_crop not in crops:
                raise ValueError("Defaults not found for crop.")
            response["crops"] = {requested_crop: crops[requested_crop]}
        return response


class FarmStore:
    def __init__(self, path: Path) -> None:
        self._store = JsonFileStore(path)

    def get_or_create_farm(
        self, user_id: str, display_name: str | None = None
    ) -> dict[str, Any]:
        def mutate(data: Any) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
            farms = self._coerce_farms(data)
            existing = farms.get(user_id)
            if existing is None:
                existing = self._default_farm(user_id, display_name)
                farms[user_id] = existing
            return farms, self._public_farm(existing)

        return self._store.update(mutate)

    def update_farm(self, user_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        def mutate(data: Any) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
            farms = self._coerce_farms(data)
            existing = farms.get(user_id, self._default_farm(user_id))
            updated = {
                **existing,
                **self._sanitize_patch(patch),
                "farmId": existing.get("farmId", self._farm_id_for(user_id)),
                "userId": user_id,
                "updatedAt": utc_now(),
            }
            farms[user_id] = updated
            return farms, updated

        return self._store.update(mutate)

    def get_machinery(self, user_id: str) -> dict[str, Any]:
        def mutate(data: Any) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
            farms = self._coerce_farms(data)
            existing = farms.get(user_id, self._default_farm(user_id))
            farms[user_id] = existing
            machinery = existing.get("machinery")
            return farms, {
                "farmId": existing.get("farmId", self._farm_id_for(user_id)),
                "machinery": machinery if isinstance(machinery, list) else [],
            }

        return self._store.update(mutate)

    def _read_farms(self) -> dict[str, dict[str, Any]]:
        return self._coerce_farms(self._store.read())

    @staticmethod
    def _coerce_farms(data: Any) -> dict[str, dict[str, Any]]:
        if data is None:
            return {}
        if not isinstance(data, dict):
            raise RuntimeError("Farm store must contain a JSON object.")
        return {
            str(key): value if isinstance(value, dict) else {}
            for key, value in data.items()
        }

    @staticmethod
    def _farm_id_for(user_id: str) -> str:
        return "farm_" + re.sub(r"[^A-Za-z0-9_-]", "_", user_id)

    def _default_farm(
        self, user_id: str, display_name: str | None = None
    ) -> dict[str, Any]:
        now = utc_now()
        name = (
            f"{display_name.strip()}'s Farm"
            if display_name and display_name.strip()
            else "My Farm"
        )
        return {
            "farmId": self._farm_id_for(user_id),
            "userId": user_id,
            "name": name,
            "state": "IA",
            "fields": [],
            "costStructure": [],
            "machinery": [],
            "createdAt": now,
            "updatedAt": now,
        }

    @staticmethod
    def _public_farm(farm: dict[str, Any]) -> dict[str, Any]:
        return {
            "farmId": farm.get("farmId"),
            "name": farm.get("name"),
            "state": farm.get("state"),
            "fields": farm.get("fields")
            if isinstance(farm.get("fields"), list)
            else [],
            "costStructure": farm.get("costStructure")
            if isinstance(farm.get("costStructure"), list)
            else [],
        }

    @staticmethod
    def _sanitize_patch(patch: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key in ("name", "state"):
            if isinstance(patch.get(key), str):
                result[key] = patch[key]
        for key in ("fields", "costStructure", "machinery"):
            if isinstance(patch.get(key), list):
                result[key] = patch[key]
        return result


class ScenarioStore:
    def __init__(self, path: Path) -> None:
        self._store = JsonFileStore(path)

    def list_summaries(self, user_id: str) -> list[dict[str, Any]]:
        summaries = [
            self._summary_for(item)
            for item in self._read_scenarios()
            if item.get("userId") == user_id
        ]
        return sorted(
            summaries, key=lambda item: str(item.get("updatedAt", "")), reverse=True
        )

    def get(self, user_id: str, scenario_id: str) -> dict[str, Any] | None:
        for scenario in self._read_scenarios():
            if scenario.get("id") == scenario_id and scenario.get("userId") == user_id:
                return self._public_scenario(scenario)
        return None

    def create(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        now = utc_now()
        scenario = {
            **self._normalize_scenario(payload),
            "id": self._new_id(),
            "userId": user_id,
            "createdAt": now,
            "updatedAt": now,
        }

        def mutate(data: Any) -> tuple[list[dict[str, Any]], dict[str, Any]]:
            scenarios = self._coerce_scenarios(data)
            scenarios.append(scenario)
            return scenarios, scenario

        return self._store.update(mutate)

    def update(
        self, user_id: str, scenario_id: str, payload: dict[str, Any]
    ) -> dict[str, Any] | None:
        def mutate(
            data: Any,
        ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
            scenarios = self._coerce_scenarios(data)
            for index, existing in enumerate(scenarios):
                if (
                    existing.get("id") == scenario_id
                    and existing.get("userId") == user_id
                ):
                    updated = {
                        **existing,
                        **self._normalize_scenario(payload),
                        "id": scenario_id,
                        "userId": user_id,
                        "createdAt": existing.get("createdAt"),
                        "updatedAt": utc_now(),
                    }
                    scenarios[index] = updated
                    return scenarios, updated
            return scenarios, None

        return self._store.update(mutate)

    def delete(self, user_id: str, scenario_id: str) -> bool:
        def mutate(data: Any) -> tuple[list[dict[str, Any]], bool]:
            scenarios = self._coerce_scenarios(data)
            remaining = [
                item
                for item in scenarios
                if not (
                    item.get("id") == scenario_id
                    and item.get("userId") == user_id
                )
            ]
            return remaining, len(remaining) != len(scenarios)

        return self._store.update(mutate)

    def _read_scenarios(self) -> list[dict[str, Any]]:
        return self._coerce_scenarios(self._store.read())

    @staticmethod
    def _coerce_scenarios(data: Any) -> list[dict[str, Any]]:
        if data is None:
            return []
        if not isinstance(data, list):
            raise RuntimeError("Scenario store must contain a JSON array.")
        return [item for item in data if isinstance(item, dict)]

    @staticmethod
    def _normalize_scenario(payload: dict[str, Any]) -> dict[str, Any]:
        result = normalize_crop_keys(payload)
        for key in ("userId", "createdAt", "updatedAt", "id"):
            result.pop(key, None)
        return result

    @staticmethod
    def _public_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
        result = deepcopy(scenario)
        result.pop("userId", None)
        return result

    @staticmethod
    def _summary_for(scenario: dict[str, Any]) -> dict[str, Any]:
        crops = scenario.get("crops")
        crop = None
        if isinstance(crops, list) and crops and isinstance(crops[0], dict):
            crop = normalize_crop(crops[0].get("crop"))
        farm = scenario.get("farm")
        farm_name = farm.get("name") if isinstance(farm, dict) else None
        return {
            "id": scenario.get("id"),
            "name": farm_name.strip()
            if isinstance(farm_name, str) and farm_name.strip()
            else f"Scenario {scenario.get('id')}",
            "crop": crop or "corn",
            "season": str(scenario.get("year", "2026")),
            "updatedAt": scenario.get("updatedAt"),
        }

    @staticmethod
    def _new_id() -> str:
        millis = int(datetime.now(timezone.utc).timestamp() * 1000)
        return f"scn_{millis}{secrets.token_hex(3)}"


def validate_scenario_payload(body: Any, partial: bool = False) -> str | None:
    if not isinstance(body, dict):
        return "Request body must be a JSON object."
    if not partial or "year" in body:
        if not _is_number(body.get("year")):
            return "Scenario.year must be a number."
    if not partial or "region" in body:
        region = body.get("region")
        if not isinstance(region, str) or not region.strip():
            return "Scenario.region must be a non-empty string."
    if not partial or "farm" in body:
        farm = body.get("farm")
        if not isinstance(farm, dict):
            return "Scenario.farm must be an object."
        for field in ("name", "address"):
            if field in farm and not isinstance(farm[field], str):
                return f"Scenario.farm.{field} must be a string."
    if not partial or "crops" in body:
        crops = body.get("crops")
        if not isinstance(crops, list) or not crops:
            return "Scenario.crops must be a non-empty array."
        for crop_entry in crops:
            if not isinstance(crop_entry, dict):
                return "Each crop entry must be an object."
            if normalize_crop(crop_entry.get("crop")) is None:
                return "Crop must be one of corn, soybeans, or other."
            if crop_entry.get("yieldBasis") not in YIELD_BASES:
                return "CropEntry.yieldBasis must be aph or expected."
            for field in (
                "acres",
                "yieldBuPerAcre",
                "cashPricePerBu",
                "govtPaymentPerAcre",
                "landCostPerAcre",
                "machineryCostPerAcre",
            ):
                if field not in crop_entry or not _is_nonnegative_number(
                    crop_entry[field]
                ):
                    return f"CropEntry.{field} must be a non-negative finite number."
            direct_costs = crop_entry.get("directCosts")
            if not isinstance(direct_costs, list):
                return "CropEntry.directCosts must be an array."
            seen_cost_keys: set[str] = set()
            for cost_line in direct_costs:
                error = _validate_cost_line(cost_line, seen_cost_keys)
                if error:
                    return error
    if "familyLiving" in body:
        family_living = body["familyLiving"]
        if not isinstance(family_living, dict):
            return "Scenario.familyLiving must be an object."
        for field in ("annualLivingExpense", "annualNonFarmIncome"):
            if field not in family_living or not _is_nonnegative_number(
                family_living[field]
            ):
                return (
                    f"Scenario.familyLiving.{field} must be a "
                    "non-negative finite number."
                )
    return None


def _is_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _is_nonnegative_number(value: Any) -> bool:
    return _is_number(value) and value >= 0


def _validate_cost_line(value: Any, seen_keys: set[str]) -> str | None:
    if not isinstance(value, dict):
        return "Each direct cost line must be an object."
    key = value.get("key")
    if not isinstance(key, str) or not key.strip():
        return "CostLine.key must be a non-empty string."
    if key in seen_keys:
        return f"CostLine.key must be unique within a crop: {key}."
    seen_keys.add(key)
    if not isinstance(value.get("label"), str) or not value["label"].strip():
        return "CostLine.label must be a non-empty string."
    if not _is_nonnegative_number(value.get("value")):
        return "CostLine.value must be a non-negative finite number."
    if value.get("source") not in COST_SOURCES:
        return "CostLine.source must be default or user."
    return None


class ClerkAuth:
    def __init__(self) -> None:
        jwks_url = os.getenv("CLERK_JWKS_URL", DEFAULT_CLERK_JWKS_URL)
        self._jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True)

    def authenticate(self, authorization: str | None) -> tuple[str, dict[str, Any]]:
        if not authorization or not authorization.strip():
            if os.getenv("SMART_FARM_ALLOW_DEV_AUTH") == "true":
                return os.getenv("SMART_FARM_DEV_USER_ID", "dev-user"), {}
            raise AuthError("unauthorized")
        match = re.fullmatch(
            r"Bearer\s+(.+)", authorization.strip(), flags=re.IGNORECASE
        )
        if match is None:
            raise AuthError("invalid_token")
        token = match.group(1)
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
        except Exception as error:
            raise AuthError("invalid_token") from error
        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id.strip():
            raise AuthError("invalid_token")
        return user_id, claims


class AuthError(Exception):
    pass


class SmartFarmServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], data_dir: Path = DATA_DIR) -> None:
        super().__init__(address, SmartFarmHandler)
        self.auth = ClerkAuth()
        self.allowed_origins = {
            origin.strip()
            for origin in os.getenv(
                "SMART_FARM_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS
            ).split(",")
            if origin.strip()
        }
        self.defaults = DefaultsRepository(data_dir / "defaults.json")
        self.farms = FarmStore(data_dir / "farms.json")
        self.scenarios = ScenarioStore(data_dir / "scenarios.json")


class SmartFarmHandler(BaseHTTPRequestHandler):
    server: SmartFarmServer

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._common_headers()
        self.end_headers()

    def do_GET(self) -> None:
        self._dispatch()

    def do_POST(self) -> None:
        self._dispatch()

    def do_PUT(self) -> None:
        self._dispatch()

    def do_DELETE(self) -> None:
        self._dispatch()

    def _dispatch(self) -> None:
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            if self.command == "GET" and path == "/defaults":
                query = parse_qs(parsed.query, keep_blank_values=True)
                body = self.server.defaults.get_defaults(
                    _first(query.get("year")),
                    _first(query.get("crop")),
                    _first(query.get("region")),
                )
                self._send_json(body)
                return

            if path in ("/api/me/farm", "/api/me/farm/machinery"):
                user_id, claims = self._require_auth()
                if path == "/api/me/farm":
                    self._handle_farm(user_id, claims)
                else:
                    self._handle_machinery(user_id)
                return

            if path == "/scenarios":
                user_id, _ = self._require_auth()
                self._handle_scenarios(user_id)
                return

            if path.startswith("/scenarios/"):
                user_id, _ = self._require_auth()
                self._handle_scenario(user_id, path[len("/scenarios/") :])
                return

            self._send_error(HTTPStatus.NOT_FOUND, "Route not found.", "NOT_FOUND")
        except AuthError as error:
            self._send_json({"error": str(error)}, HTTPStatus.UNAUTHORIZED)
        except ValueError as error:
            self._send_error(HTTPStatus.BAD_REQUEST, str(error), "BAD_REQUEST")
        except json.JSONDecodeError:
            self._send_error(
                HTTPStatus.BAD_REQUEST, "Invalid JSON body.", "INVALID_JSON"
            )
        except Exception:
            self._send_error(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                "Internal server error.",
                "INTERNAL_ERROR",
            )

    def _handle_farm(self, user_id: str, claims: dict[str, Any]) -> None:
        if self.command == "GET":
            self._send_json(
                self.server.farms.get_or_create_farm(user_id, _display_name(claims))
            )
            return
        if self.command == "PUT":
            body = self._read_json()
            if not isinstance(body, dict):
                self._send_error(
                    HTTPStatus.BAD_REQUEST,
                    "Request body must be a JSON object.",
                    "INVALID_FARM",
                )
                return
            updated = self.server.farms.update_farm(user_id, body)
            self._send_json({"ok": True, "updatedAt": updated["updatedAt"]})
            return
        self._method_not_allowed()

    def _handle_machinery(self, user_id: str) -> None:
        if self.command == "GET":
            self._send_json(self.server.farms.get_machinery(user_id))
            return
        self._method_not_allowed()

    def _handle_scenarios(self, user_id: str) -> None:
        if self.command == "GET":
            self._send_json(
                {"scenarios": self.server.scenarios.list_summaries(user_id)}
            )
            return
        if self.command == "POST":
            body = self._read_json()
            validation_error = validate_scenario_payload(body)
            if validation_error:
                self._send_error(
                    HTTPStatus.BAD_REQUEST, validation_error, "INVALID_SCENARIO"
                )
                return
            scenario = self.server.scenarios.create(user_id, body)
            self._send_json(
                {"id": scenario["id"], "updatedAt": scenario["updatedAt"]},
                HTTPStatus.CREATED,
            )
            return
        self._method_not_allowed()

    def _handle_scenario(self, user_id: str, scenario_id: str) -> None:
        if not scenario_id.strip():
            self._scenario_not_found()
            return
        if self.command == "GET":
            scenario = self.server.scenarios.get(user_id, scenario_id)
            if scenario is None:
                self._scenario_not_found()
            else:
                self._send_json(scenario)
            return
        if self.command == "PUT":
            body = self._read_json()
            validation_error = validate_scenario_payload(body, partial=True)
            if validation_error:
                self._send_error(
                    HTTPStatus.BAD_REQUEST, validation_error, "INVALID_SCENARIO"
                )
                return
            updated = self.server.scenarios.update(user_id, scenario_id, body)
            if updated is None:
                self._scenario_not_found()
            else:
                self._send_json({"ok": True, "updatedAt": updated["updatedAt"]})
            return
        if self.command == "DELETE":
            if not self.server.scenarios.delete(user_id, scenario_id):
                self._scenario_not_found()
            else:
                self.send_response(HTTPStatus.NO_CONTENT)
                self._common_headers()
                self.end_headers()
            return
        self._method_not_allowed()

    def _require_auth(self) -> tuple[str, dict[str, Any]]:
        return self.server.auth.authenticate(self.headers.get("Authorization"))

    def _read_json(self) -> Any:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        if not raw.strip():
            return None
        return json.loads(raw.decode("utf-8"))

    def _send_json(self, body: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = json.dumps(body, indent=2, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._common_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_error(self, status: HTTPStatus, message: str, code: str) -> None:
        self._send_json({"message": message, "code": code}, status)

    def _method_not_allowed(self) -> None:
        self._send_error(
            HTTPStatus.METHOD_NOT_ALLOWED, "Method not allowed.", "METHOD_NOT_ALLOWED"
        )

    def _scenario_not_found(self) -> None:
        self._send_error(
            HTTPStatus.NOT_FOUND, "Scenario not found.", "SCENARIO_NOT_FOUND"
        )

    def _common_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin and origin in self.server.allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
        )
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store")

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}", file=sys.stderr)


def _first(values: list[str] | None) -> str | None:
    return values[0] if values else None


def _display_name(claims: dict[str, Any]) -> str | None:
    for key in ("name", "full_name", "given_name", "email"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def read_port(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Smart Farm Python API server")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args(argv)
    try:
        return int(os.environ.get("PORT", args.port))
    except ValueError:
        return args.port


def main(argv: list[str] | None = None) -> None:
    port = read_port(argv)
    server = SmartFarmServer(("0.0.0.0", port))
    print(f"Smart Farm backend listening on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
