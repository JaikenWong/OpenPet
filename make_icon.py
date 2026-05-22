import json
import os
from PIL import Image

def generate_icon():
    os.makedirs('build', exist_ok=True)
    with open('public/sprites.json') as f:
        data = json.load(f)
    
    frame = data.get('p0018-idle_00.png')
    if not frame:
        print("Frame not found")
        return
    
    sheet = Image.open('public/spritesheet.png')
    cropped = sheet.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
    
    # Trim transparent padding — pet hugs boundary
    bbox = cropped.getbbox()
    if bbox:
        cropped = cropped.crop(bbox)
    
    # Add small padding (4% each side) so pet doesn't clip
    PAD = 0.04
    icon_size = 512
    inner = int(icon_size * (1 - PAD * 2))
    w, h = cropped.size
    scale = min(inner/w, inner/h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    icon = Image.new("RGBA", (icon_size, icon_size), (0,0,0,0))
    icon.paste(resized, ((icon_size - new_w)//2, (icon_size - new_h)//2))
    icon.save('build/icon.png')
    
    # Also save one to root for main.js to use in dev
    icon.save('icon.png')
    print("Icon generated.")

if __name__ == '__main__':
    generate_icon()
