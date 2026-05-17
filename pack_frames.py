import os
import glob
import json
from PIL import Image

def pack_frames():
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    png_files = sorted(glob.glob(os.path.join(public_dir, 'p0018-*.png')))
    
    if not png_files:
        print("No PNG files found.")
        return

    frames = []
    max_shelf_height = 0
    current_x = 0
    current_y = 0
    max_width = 2048
    total_height = 0

    # First pass: find bboxes and calculate layout
    packed_data = {}
    for fp in png_files:
        filename = os.path.basename(fp)
        img = Image.open(fp)
        bbox = img.getbbox()
        
        if not bbox:
            # Completely transparent image
            packed_data[filename] = {"x": 0, "y": 0, "w": 0, "h": 0, "ox": 0, "oy": 0}
            continue
            
        cropped = img.crop(bbox)
        w, h = cropped.size
        
        if current_x + w > max_width:
            current_x = 0
            current_y += max_shelf_height
            max_shelf_height = 0
            
        frames.append({
            "img": cropped,
            "filename": filename,
            "x": current_x,
            "y": current_y,
            "w": w,
            "h": h,
            "ox": bbox[0],
            "oy": bbox[1]
        })
        
        current_x += w
        max_shelf_height = max(max_shelf_height, h)
        
    total_height = current_y + max_shelf_height

    # Create big image
    spritesheet = Image.new("RGBA", (max_width, total_height), (0,0,0,0))
    
    for f in frames:
        spritesheet.paste(f['img'], (f['x'], f['y']))
        # Extract base name without prefix and extension, e.g., 'idle_00' from 'p0018-idle_00.png'
        # Actually, renderer.js expects exactly 'idle', 'move' etc.
        # But we can just store the full filename or without extension
        # Let's map base name (e.g. idle_00)
        # Or just store by "p0018-idle_00.png"
        packed_data[f['filename']] = {
            "x": f['x'],
            "y": f['y'],
            "w": f['w'],
            "h": f['h'],
            "ox": f['ox'],
            "oy": f['oy']
        }
        f['img'].close()

    sheet_path = os.path.join(public_dir, 'spritesheet.png')
    json_path = os.path.join(public_dir, 'sprites.json')
    
    spritesheet.save(sheet_path, "PNG", optimize=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(packed_data, f, separators=(',', ':'))
        
    print(f"Packed {len(png_files)} frames into {max_width}x{total_height} spritesheet.")

if __name__ == '__main__':
    pack_frames()
