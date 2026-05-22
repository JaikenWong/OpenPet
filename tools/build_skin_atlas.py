import argparse
import glob
import json
import os
from pathlib import Path
from PIL import Image


def pack_one(src_dir: Path, prefix: str, out_dir: Path):
    png_files = sorted(glob.glob(str(src_dir / f"{prefix}-*.png")))
    if not png_files:
        raise RuntimeError(f"no frames found for {prefix} in {src_dir}")

    frames = []
    packed_data = {}
    max_shelf_height = 0
    current_x = 0
    current_y = 0
    max_width = 2048

    for fp in png_files:
        filename = os.path.basename(fp)
        img = Image.open(fp)
        bbox = img.getbbox()
        if not bbox:
            packed_data[filename] = {"x": 0, "y": 0, "w": 0, "h": 0, "ox": 0, "oy": 0}
            img.close()
            continue

        cropped = img.crop(bbox)
        img.close()
        w, h = cropped.size
        if current_x + w > max_width:
            current_x = 0
            current_y += max_shelf_height
            max_shelf_height = 0

        frames.append(
            {
                "img": cropped,
                "filename": filename,
                "x": current_x,
                "y": current_y,
                "w": w,
                "h": h,
                "ox": bbox[0],
                "oy": bbox[1],
            }
        )
        current_x += w
        max_shelf_height = max(max_shelf_height, h)

    total_height = current_y + max_shelf_height
    spritesheet = Image.new("RGBA", (max_width, total_height), (0, 0, 0, 0))
    for f in frames:
        spritesheet.paste(f["img"], (f["x"], f["y"]))
        packed_data[f["filename"]] = {
            "x": f["x"],
            "y": f["y"],
            "w": f["w"],
            "h": f["h"],
            "ox": f["ox"],
            "oy": f["oy"],
        }
        f["img"].close()

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "spritesheet.png").write_bytes(b"")
    spritesheet.save(out_dir / "spritesheet.png", "PNG", optimize=True)
    with open(out_dir / "sprites.json", "w", encoding="utf-8") as f:
        json.dump(packed_data, f, separators=(",", ":"))

    print(f"{prefix}: {len(png_files)} frames -> {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, help="sequence root directory")
    parser.add_argument("--ids", nargs="+", required=True, help="skin ids like p0017 p0018")
    parser.add_argument("--out", required=True, help="output directory")
    args = parser.parse_args()

    root = Path(args.root)
    out_root = Path(args.out)
    for skin_id in args.ids:
        src_dir = root / skin_id
        pack_one(src_dir, skin_id, out_root / skin_id)


if __name__ == "__main__":
    main()
