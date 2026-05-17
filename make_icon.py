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
    
    icon = Image.new("RGBA", (512, 512), (0,0,0,0))
    w, h = cropped.size
    scale = min(512/w, 512/h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    icon.paste(resized, ((512 - new_w)//2, (512 - new_h)//2))
    icon.save('build/icon.png')
    
    # Also save one to root for main.js to use in dev
    icon.save('icon.png')
    print("Icon generated.")

if __name__ == '__main__':
    generate_icon()
