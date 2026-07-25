from __future__ import annotations

import argparse
import json
import os
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


DATA_FILES = ("farms.json", "scenarios.json")


def create_backup(data_dir: Path, destination: Path) -> Path:
    """Create an atomic timestamped ZIP after validating every JSON source."""
    sources: list[Path] = []
    for name in DATA_FILES:
        source = data_dir / name
        if not source.is_file():
            continue
        json.loads(source.read_text(encoding="utf-8"))
        sources.append(source)
    if not sources:
        raise FileNotFoundError("No farm or scenario data files were found.")

    destination.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    output = destination / f"smart-farm-data-{timestamp}.zip"
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".smart-farm-backup-", suffix=".tmp", dir=destination
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        with zipfile.ZipFile(
            temporary, "w", compression=zipfile.ZIP_DEFLATED
        ) as archive:
            for source in sources:
                archive.write(source, arcname=source.name)
        temporary.replace(output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return output


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Back up Smart Farm production JSON data."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "data",
    )
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args(argv)
    output = create_backup(args.data_dir.resolve(), args.destination.resolve())
    print(output)


if __name__ == "__main__":
    main()
