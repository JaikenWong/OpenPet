const ANIM = {
  idle: { end: 20, loop: true, fps: 12 },
  move: { end: 14, loop: true, fps: 15 },
  attack01: { end: 14, loop: false, fps: 15 },
  attack02: { end: 14, loop: false, fps: 15 },
  attack03: { end: 14, loop: false, fps: 15 },
  attack04: { end: 14, loop: false, fps: 15 },
  skill01: { end: 54, loop: false, fps: 20 },
  block: { end: 10, loop: false, fps: 15 },
  suffer: { end: 17, loop: false, fps: 15 },
  born: { end: 17, loop: false, fps: 15 },
  out: { end: 20, loop: false, fps: 15 },
  vertigo: { end: 20, loop: true, fps: 12 }
};

const STATE = {
  BORN: 'BORN',
  IDLE: 'IDLE',
  WANDER: 'WANDER',
  INTERACT: 'INTERACT',
  DRAGGING: 'DRAGGING'
};

class RadialMenu {
  constructor(fsm) {
    this.fsm = fsm;
    this.el = document.getElementById('radial-menu');
    this.isActive = false;
    this.items = [];
    this.loadConfigAndBuild();
  }
  
  async loadConfigAndBuild() {
    const config = await window.openpet.getConfig();
    this.items = config.links.map(link => ({
      label: link.label,
      action: link.action || 'skill01',
      url: link.url
    }));
    
    this.items.push({
      label: '⚙设置',
      isSettings: true
    });
    
    this.build();
  }
  
  build() {
    this.el.innerHTML = '';
    const angleStep = 360 / this.items.length;
    const radius = 60;
    
    this.items.forEach((item, i) => {
      const angle = i * angleStep;
      const rad = (angle - 90) * Math.PI / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      
      const btn = document.createElement('div');
      btn.className = 'radial-btn';
      btn.textContent = item.label;
      btn.style.setProperty('--tx', `${x}px`);
      btn.style.setProperty('--ty', `${y}px`);
      
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        if (item.isSettings) {
          window.openpet.openSettingsWindow();
        } else {
          this.fsm.playAction(item.action);
          if (item.url) window.openpet.openExternalUrl(item.url);
        }
      });
      
      this.el.appendChild(btn);
    });
  }

  toggle() {
    this.isActive = !this.isActive;
    this.el.classList.toggle('active', this.isActive);
  }

  hide() {
    this.isActive = false;
    this.el.classList.remove('active');
  }
}

class PetFSM {
  constructor() {
    this.canvas = document.getElementById('pet');
    this.ctx = this.canvas.getContext('2d');
    this.sheet = new Image();
    this.sprites = null;
    
    this.state = null;
    this.curAnim = null;
    this.timer = null;
    this.wanderInterval = null;
    this.behaviorTimeout = null;
    this.isFacingLeft = false;

    this.dragStartPos = { x: 0, y: 0 };
    this.winStartPos = null;

    this.radialMenu = new RadialMenu(this);
    this.init();
  }

  async init() {
    const res = await fetch('public/sprites.json');
    this.sprites = await res.json();
    
    this.sheet.src = 'public/spritesheet.png';
    this.sheet.onload = () => {
      this.bindEvents();
      this.transitionTo(STATE.BORN);
    };
  }

  playAnim(name, onEnd) {
    if (!ANIM[name]) return;
    if (this.timer) clearInterval(this.timer);
    
    const cfg = ANIM[name];
    this.curAnim = name;
    let i = 0;
    
    const drawFrame = () => {
      const frameKey = `p0018-${name}_${String(i).padStart(2, '0')}.png`;
      const data = this.sprites[frameKey];
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (data && data.w > 0) {
        this.ctx.save();
        if (this.isFacingLeft) {
          this.ctx.translate(this.canvas.width, 0);
          this.ctx.scale(-1, 1);
        }
        this.ctx.drawImage(
          this.sheet,
          data.x, data.y, data.w, data.h,
          data.ox, data.oy, data.w, data.h
        );
        this.ctx.restore();
      }
      
      i++;
      if (i > cfg.end) {
        if (cfg.loop) {
          i = 0;
        } else {
          clearInterval(this.timer);
          if (onEnd) onEnd();
        }
      }
    };
    
    drawFrame();
    this.timer = setInterval(drawFrame, 1000 / cfg.fps);
  }

  transitionTo(newState) {
    if (this.behaviorTimeout) clearTimeout(this.behaviorTimeout);
    if (this.wanderInterval) clearInterval(this.wanderInterval);
    
    this.state = newState;
    
    switch(newState) {
      case STATE.BORN:
        this.playAnim('born', () => this.transitionTo(STATE.IDLE));
        break;
        
      case STATE.IDLE:
        const idles = ['idle', 'idle', 'idle', 'block']; 
        const choice = idles[Math.floor(Math.random() * idles.length)];
        this.playAnim(choice, () => {
          if (!ANIM[choice].loop) {
            this.playAnim('idle');
          }
        });
        
        this.behaviorTimeout = setTimeout(() => {
          if (Math.random() < 0.4) {
            this.transitionTo(STATE.WANDER);
          } else {
            this.transitionTo(STATE.IDLE);
          }
        }, 5000 + Math.random() * 3000);
        break;
        
      case STATE.WANDER:
        this.doWander();
        break;
        
      case STATE.INTERACT:
        // Do nothing, handled by playAction
        break;
        
      case STATE.DRAGGING:
        this.playAnim('suffer'); 
        break;
    }
  }

  playAction(animName) {
    this.transitionTo(STATE.INTERACT);
    this.playAnim(animName, () => this.transitionTo(STATE.IDLE));
  }

  async doWander() {
    const bounds = await window.openpet.getScreenBounds();
    const pos = await window.openpet.getWindowPosition();
    if (!pos || !bounds) {
      this.transitionTo(STATE.IDLE);
      return;
    }
    
    const maxW = bounds.width - 200;
    const offset = (Math.random() - 0.5) * 600;
    const targetX = Math.max(0, Math.min(maxW, pos.x + offset));
    
    if (Math.abs(targetX - pos.x) < 50) {
      this.transitionTo(STATE.IDLE);
      return;
    }

    this.isFacingLeft = (targetX < pos.x);
    this.playAnim('move');
    
    const steps = 120;
    let step = 0;
    const stepX = (targetX - pos.x) / steps;
    
    this.wanderInterval = setInterval(() => {
      pos.x += stepX;
      window.openpet.setWindowPosition(Math.round(pos.x), Math.round(pos.y));
      step++;
      if (step >= steps) {
        this.transitionTo(STATE.IDLE);
      }
    }, 1000 / 60);
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', async (e) => {
      e.preventDefault();
      
      if (e.button === 2) {
        this.radialMenu.toggle();
        return;
      }
      
      this.radialMenu.hide();
      
      if (this.state === STATE.INTERACT) return; 
      
      this.transitionTo(STATE.DRAGGING);
      this.dragStartPos = { x: e.screenX, y: e.screenY };
      this.winStartPos = await window.openpet.getWindowPosition();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.state === STATE.DRAGGING && this.winStartPos) {
        const dx = e.screenX - this.dragStartPos.x;
        const dy = e.screenY - this.dragStartPos.y;
        window.openpet.setWindowPosition(Math.round(this.winStartPos.x + dx), Math.round(this.winStartPos.y + dy));
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.state === STATE.DRAGGING) {
        const dx = Math.abs(e.screenX - this.dragStartPos.x);
        const dy = Math.abs(e.screenY - this.dragStartPos.y);
        
        if (dx < 5 && dy < 5) {
          window.openpet.toggleChatWindow();
          this.transitionTo(STATE.IDLE);
        } else {
          this.transitionTo(STATE.IDLE);
        }
      }
    });
  }
}

window.addEventListener('load', () => {
  new PetFSM();
});
