from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import SmartFarmServer, normalize_crop, validate_scenario_payload


class BackendUnitTests(unittest.TestCase):
    def test_only_canonical_crops_are_accepted(self) -> None:
        self.assertEqual(normalize_crop(" SOYBEANS "), "soybeans")
        self.assertIsNone(normalize_crop("soybean"))

    def test_scenario_validation_rejects_invalid_crop(self) -> None:
        error = validate_scenario_payload(
            {"year": 2026, "region": "midwest", "crops": [{"crop": "wheat"}]}
        )
        self.assertEqual(error, "Crop must be one of corn, soybeans, or other.")


class BackendHttpTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_dev_auth = os.environ.get("SMART_FARM_ALLOW_DEV_AUTH")
        os.environ["SMART_FARM_ALLOW_DEV_AUTH"] = "true"
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

    def request(
        self, method: str, path: str, body: dict[str, object] | None = None
    ) -> tuple[int, object | None]:
        payload = json.dumps(body).encode() if body is not None else None
        request = Request(
            self.base_url + path,
            data=payload,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urlopen(request) as response:
                raw = response.read()
                return response.status, json.loads(raw) if raw else None
        except HTTPError as error:
            try:
                raw = error.read()
                return error.code, json.loads(raw) if raw else None
            finally:
                error.close()

    def test_defaults_and_scenario_crud(self) -> None:
        status, defaults = self.request("GET", "/defaults?crop=corn")
        self.assertEqual(status, 200)
        self.assertEqual(list(defaults["crops"]), ["corn"])

        payload = {
            "year": 2026,
            "region": "midwest",
            "farm": {"name": "North 80"},
            "crops": [{"crop": "corn", "acres": 80}],
        }
        status, created = self.request("POST", "/scenarios", payload)
        self.assertEqual(status, 201)
        scenario_id = created["id"]

        status, listing = self.request("GET", "/scenarios")
        self.assertEqual(status, 200)
        self.assertEqual(listing["scenarios"][0]["id"], scenario_id)

        status, scenario = self.request("GET", f"/scenarios/{scenario_id}")
        self.assertEqual(status, 200)
        self.assertNotIn("userId", scenario)

        status, updated = self.request(
            "PUT", f"/scenarios/{scenario_id}", {"farm": {"name": "Updated"}}
        )
        self.assertEqual(status, 200)
        self.assertTrue(updated["ok"])

        status, body = self.request("DELETE", f"/scenarios/{scenario_id}")
        self.assertEqual(status, 204)
        self.assertIsNone(body)

    def test_farm_routes(self) -> None:
        status, farm = self.request("GET", "/api/me/farm")
        self.assertEqual(status, 200)
        self.assertEqual(farm["state"], "IA")

        status, response = self.request(
            "PUT", "/api/me/farm", {"name": "Test Farm", "state": "IL"}
        )
        self.assertEqual(status, 200)
        self.assertTrue(response["ok"])

        status, farm = self.request("GET", "/api/me/farm")
        self.assertEqual(status, 200)
        self.assertEqual(farm["name"], "Test Farm")

    def test_protected_routes_require_auth(self) -> None:
        os.environ["SMART_FARM_ALLOW_DEV_AUTH"] = "false"
        status, body = self.request("GET", "/scenarios")
        self.assertEqual(status, 401)
        self.assertEqual(body, {"error": "unauthorized"})


if __name__ == "__main__":
    unittest.main()
