let currentConfig = null;
let skinManifest = null;

document.getElementById('close').addEventListener('click', () => {
  window.settingsAPI.close();
});

async function loadConfig() {
  [currentConfig, skinManifest] = await Promise.all([
    window.settingsAPI.getConfig(),
    window.settingsAPI.getSkinManifest()
  ]);
  document.getElementById('api_url').value = currentConfig.api_url || '';
  document.getElementById('api_key').value = currentConfig.api_key || '';
  document.getElementById('model').value = currentConfig.model || '';
  renderAppearanceSelectors();

  const container = document.getElementById('links-container');
  container.innerHTML = '';
  
  if (!currentConfig.links || currentConfig.links.length < 4) {
    currentConfig.links = [
      { label: 'B站', url: 'https://bilibili.com', action: 'skill01' },
      { label: 'GitHub', url: 'https://github.com', action: 'block' },
      { label: '掘金', url: 'https://juejin.cn', action: 'vertigo' },
      { label: '推特', url: 'https://twitter.com', action: 'attack01' }
    ];
  }

  currentConfig.links.forEach((link, i) => {
    const div = document.createElement('div');
    div.className = 'row-flex';
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <div>
        <label>Button ${i + 1} Label</label>
        <input type="text" id="link-label-${i}" value="${link.label}">
      </div>
      <div style="flex: 2;">
        <label>URL</label>
        <input type="text" id="link-url-${i}" value="${link.url}">
      </div>
    `;
    container.appendChild(div);
  });
}

function renderAppearanceSelectors() {
  const skinSelect = document.getElementById('skin_id');
  const outfitSelect = document.getElementById('outfit_id');
  skinSelect.innerHTML = '';
  outfitSelect.innerHTML = '';

  (skinManifest?.skins || []).forEach((skin) => {
    const op = document.createElement('option');
    op.value = skin.id;
    op.textContent = skin.name;
    if ((currentConfig.skin_id || 'p0018') === skin.id) op.selected = true;
    skinSelect.appendChild(op);
  });

  (skinManifest?.outfits || []).forEach((outfit) => {
    const op = document.createElement('option');
    op.value = outfit.id;
    op.textContent = outfit.name;
    if ((currentConfig.outfit_id || 'none') === outfit.id) op.selected = true;
    outfitSelect.appendChild(op);
  });
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const newConfig = {
    ...currentConfig,
    api_url: document.getElementById('api_url').value,
    api_key: document.getElementById('api_key').value,
    model: document.getElementById('model').value,
    skin_id: document.getElementById('skin_id').value,
    outfit_id: document.getElementById('outfit_id').value,
    links: currentConfig.links.map((link, i) => ({
      ...link,
      label: document.getElementById(`link-label-${i}`).value,
      url: document.getElementById(`link-url-${i}`).value
    }))
  };
  await window.settingsAPI.saveConfig(newConfig);
});

loadConfig();
