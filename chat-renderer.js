const body = document.getElementById('body');
const input = document.getElementById('input');
const send = document.getElementById('send');
const closeBtn = document.getElementById('close');

function addMsg(role, content) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = content;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function doSend() {
  const text = input.value.trim();
  if (!text) return;

  addMsg('user', text);
  input.value = '';
  send.disabled = true;
  showTyping();

  try {
    const r = await window.chat.sendMessage(text);
    hideTyping();
    addMsg('assistant', r.content);
  } catch (e) {
    hideTyping();
    addMsg('system', `发送失败: ${e.message}`);
  } finally {
    send.disabled = false;
    input.focus();
  }
}

send.addEventListener('click', doSend);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') doSend();
});
closeBtn.addEventListener('click', () => window.chat.closeWindow());

window.addEventListener('load', () => input.focus());
