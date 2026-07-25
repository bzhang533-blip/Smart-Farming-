from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import (
    DEFAULT_CLERK_JWKS_URL,
    ClerkAuth,
    ScenarioStore,
    SmartFarmServer,
    normalize_crop,
    validate_scenario_payload,
)
from backup import create_backup


def scenario_payload(name: str = "North 80") -> dict[str, object]:
    return {
        "year": 2026,
        "region": "midwest",
        "farm": {"name": name},
        "crops": [
            {
                "crop": "corn",
                "acres": 80,
                "yieldBasis": "aph",
                "yieldBuPerAcre": 210,
                "cashPricePerBu": 4.2,
                "govtPaymentPerAcre": 0,
                "directCosts": [
                    {
                        "key": "seed",
                        "label": "Seed",
                        "value": 135,
                        "source": "default",
                    }
                ],
                "landCostPerAcre": 265,
                "machineryCostPerAcre": 65,
            }
        ],
    }


class BackendUnitTests(unittest.TestCase):
    def test_only_canonical_crops_are_accepted(self) -> None:
        self.assertEqual(normalize_crop(" SOYBEANS "), "soybeans")
        self.assertIsNone(normalize_crop("soybean"))

    def test_scenario_validation_rejects_invalid_crop(self) -> None:
        payload = scenario_payload()
        payload["crops"][0]["crop"] = "wheat"
        error = validate_scenario_payload(payload)
        self.assertEqual(error, "Crop must be one of corn, soybeans, or other.")

    def test_scenario_validation_rejects_negative_and_infinite_values(self) -> None:
        payload = scenario_payload()
        payload["crops"][0]["acres"] = -1
        self.assertIn("non-negative finite", validate_scenario_payload(payload))

        payload = scenario_payload()
        payload["crops"][0]["directCosts"][0]["value"] = float("inf")
        self.assertIn("non-negative finite", validate_scenario_payload(payload))

    def test_scenario_validation_rejects_duplicate_cost_keys(self) -> None:
        payload = scenario_payload()
        payload["crops"][0]["directCosts"].append(
            {
                "key": "seed",
                "label": "Duplicate seed",
                "value": 1,
                "source": "user",
            }
        )
        self.assertIn("must be unique", validate_scenario_payload(payload))

    def test_clerk_uses_public_instance_jwks_by_default(self) -> None:
        old_value = os.environ.pop("CLERK_JWKS_URL", None)
        try:
            auth = ClerkAuth()
            self.assertEqual(auth._jwks_client.uri, DEFAULT_CLERK_JWKS_URL)
        finally:
            if old_value is not None:
                os.environ["CLERK_JWKS_URL"] = old_value

    def test_concurrent_scenario_creates_do_not_lose_updates(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            store = ScenarioStore(Path(temporary) / "scenarios.json")

            def create(index: int) -> None:
                store.create("dev-user", scenario_payload(f"Farm {index}"))

            with ThreadPoolExecutor(max_workers=8) as executor:
                list(executor.map(create, range(50)))

            self.assertEqual(len(store.list_summaries("dev-user")), 50)

    def test_backup_validates_and_archives_production_data(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            data_dir = root / "data"
            destination = root / "backups"
            data_dir.mkdir()
            (data_dir / "farms.json").write_text(
                '{"dev-user": {"name": "Test"}}\n', encoding="utf-8"
            )
            (data_dir / "scenarios.json").write_text("[]\n", encoding="utf-8")

            output = create_backup(data_dir, destination)

            self.assertTrue(output.is_file())
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(
                    set(archive.namelist()), {"farms.json", "scenarios.json"}
                )

    def test_backup_rejects_invalid_json(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            data_dir = root / "data"
            data_dir.mkdir()
            (data_dir / "farms.json").write_text("{broken", encoding="utf-8")
            with self.assertRaises(json.JSONDecodeError):
                create_backup(data_dir, root / "backups")


class BackendHttpTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_dev_auth = os.environ.get("SMART_FARM_ALLOW_DEV_AUTH")
        self._old_allowed_origins = os.environ.get("SMART_FARM_ALLOWED_ORIGINS")
        os.environ["SMART_FARM_ALLOW_DEV_AUTH"] = "true"
        os.environ["SMART_FARM_ALLOWED_ORIGINS"] = (
            "https://app.smartfarms.cc,http://localhost:3000"
        )
        self._temporary = tempfile.TemporaryDirectory()
        data_dir = Path(self._temporary.name)
        source_defaults = Path(__file__).resolve().parents[1] / "data" / "defaults.json"
        (data_dir / "defaults.json").write_text(
            source_defaults.read_text(encoding="utf-8"), encoding="utf-8"
        )
        (data_dir / "scenarios.json").write_text("[]\n", encoding="utf-8")
        self.server = SmartFarmServer(("127.0.0.1", 0), data_dir)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self._temporary.cleanup()
        if self._old_dev_auth is None:
            os.environ.pop("SMART_FARM_ALLOW_DEV_AUTH", None)
        else:
            os.environ["SMART_FARM_ALLOW_DEV_AUTH"] = self._old_dev_auth
        if self._old_allowed_origins is None:
            os.environ.pop("SMART_FARM_ALLOWED_ORIGINS", None)
        else:
            os.environ["SMART_FARM_ALLOWED_ORIGINS"] = self._old_allowed_origins

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, object | None, dict[str, str]]:
        payload = json.dumps(body).encode() if body is not None else None
        request = Request(
            self.base_url + path,
            data=payload,
            method=method,
            headers={"Content-Type": "application/json", **(headers or {})},
        )
        try:
            with urlopen(request) as response:
                raw = response.read()
                return (
                    response.status,
                    json.loads(raw) if raw else None,
                    dict(response.headers),
                )
        except HTTPError as error:
            try:
                raw = error.read()
                return error.code, json.loads(raw) if raw else None, dict(error.headers)
            finally:
                error.close()

    def test_defaults_and_scenario_crud(self) -> None:
        status, defaults, _ = self.request(
            "GET", "/defaults?year=2026&crop=corn"
        )
        self.assertEqual(status, 200)
        self.assertEqual(list(defaults["crops"]), ["corn"])

        status, created, _ = self.request("POST", "/scenarios", scenario_payload())
        self.assertEqual(status, 201)
        scenario_id = created["id"]

        status, listing, _ = self.request("GET", "/scenarios")
        self.assertEqual(status, 200)
        self.assertEqual(listing["scenarios"][0]["id"], scenario_id)

        status, scenario, _ = self.request("GET", f"/scenarios/{scenario_id}")
        self.assertEqual(status, 200)
        self.assertNotIn("userId", scenario)

        status, updated, _ = self.request(
            "PUT", f"/scenarios/{scenario_id}", {"farm": {"name": "Updated"}}
        )
        self.assertEqual(status, 200)
        self.assertTrue(updated["ok"])

        status, body, _ = self.request("DELETE", f"/scenarios/{scenario_id}")
        self.assertEqual(status, 204)
        self.assertIsNone(body)

    def test_defaults_reject_unknown_year(self) -> None:
        status, body, _ = self.request("GET", "/defaults?year=2025")
        self.assertEqual(status, 400)
        self.assertEqual(body["message"], "Defaults not found for year.")

    def test_farm_routes(self) -> None:
        status, farm, _ = self.request("GET", "/api/me/farm")
        self.assertEqual(status, 200)
        self.assertEqual(farm["state"], "IA")

        status, response, _ = self.request(
            "PUT", "/api/me/farm", {"name": "Test Farm", "state": "IL"}
        )
        self.assertEqual(status, 200)
        self.assertTrue(response["ok"])

        status, farm, _ = self.request("GET", "/api/me/farm")
        self.assertEqual(status, 200)
        self.assertEqual(farm["name"], "Test Farm")

    def test_protected_routes_require_auth(self) -> None:
        os.environ["SMART_FARM_ALLOW_DEV_AUTH"] = "false"
        status, body, _ = self.request("GET", "/scenarios")
        self.assertEqual(status, 401)
        self.assertEqual(body, {"error": "unauthorized"})

    def test_cors_only_allows_configured_origins(self) -> None:
        status, _, headers = self.request(
            "OPTIONS", "/scenarios", headers={"Origin": "https://app.smartfarms.cc"}
        )
        self.assertEqual(status, 204)
        self.assertEqual(
            headers.get("Access-Control-Allow-Origin"),
            "https://app.smartfarms.cc",
        )

        status, _, headers = self.request(
            "OPTIONS", "/scenarios", headers={"Origin": "https://malicious.example"}
        )
        self.assertEqual(status, 204)
        self.assertNotIn("Access-Control-Allow-Origin", headers)


if __name__ == "__main__":
    unittest.main()
