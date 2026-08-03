const DATA_URL = 'data.json';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function render(entries) {
  const box = document.getElementById('entries');
  if (!entries || !entries.length) {
    box.innerHTML = '<p class="empty">还没有日记，去写第一篇吧。</p>';
    return;
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  box.innerHTML = entries.map(e => `
    <article class="entry">
      <div class="entry-meta">
        <span class="date">${esc(e.date)}</span>
        ${e.title ? `<span class="title">${esc(e.title)}</span>` : ''}
      </div>
      <div class="entry-body">${esc(e.content).replace(/\n/g, '<br>')}</div>
    </article>`).join('');
}

async function load() {
  try {
    const res = await fetch(DATA_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('加载失败');
    const entries = await res.json();
    render(entries);
  } catch (e) {
    document.getElementById('entries').innerHTML =
      '<p class="empty">读取日记失败，请确认 data.json 已上传到仓库根目录。</p>';
  }
}

load();
