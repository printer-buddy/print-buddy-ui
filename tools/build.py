#LICENSE
#
#Copyright (C) 2026  sterling motuz <Sterling@dexabyte.ca>
#
#for https://github.com/printer-buddy/printer-buddy
#
#SPDX-License-Identifier: AGPL-3.0-only
#
#Additional term (AGPL-3.0 section 7b, keep author credit): keep this header
#
#Additional term (AGPL-3.0 section 7c, mark changed versions): if you make any changes, you must include a CHANGELOG with all changes and their dates
import json
import sys
import tarfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = "print-buddy-ui"


def build(out):
    out.mkdir(parents=True, exist_ok=True)
    for tier, spec in json.loads((ROOT / "tiers.json").read_text()).items():
        path = out / f"{NAME}-{tier}.tar.gz"
        with tarfile.open(path, "w:gz") as tar:
            for f in spec["files"] + ["LICENSE", "NOTICE"]:
                tar.add(ROOT / f, arcname=f"{NAME}/{f}")
            data = tier.encode()
            info = tarfile.TarInfo(f"{NAME}/TIER")
            info.size = len(data)
            tar.addfile(info, BytesIO(data))
        print(path)


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "dist"))
