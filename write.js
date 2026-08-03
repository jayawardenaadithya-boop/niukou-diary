const API = 'https://api.github.com';

function loadCfg() {
  return {
    owner: localStorage.getItem('diary_owner') || '',
    repo: localStorage.getItem('diary_repo') || '',
    branch: localStorage.getItem('diary_branch') || 'main',
    token: localStorage.getItem('diary_token') || ''
  };
}

function saveCfg() {
  localStorage.setItem('diary_owner', document.getElementById('cfg-owner').value.trim());
  localStorage.setItem('diary_repo', document.getElementById('cfg-repo').value.trim());
  localStorage.setItem('diary_branch', document.getElementById('cfg-branch').value.trim() || 'main');
  localStorage.setItem('diary_token', document.getElementById('cfg-token').value.trim());
  alert('设置已保存到本机浏览器');
}

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function commitEntry(entry) {
  const cfg = loadCfg();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert('请先在上方「仓库设置」里填好并保存（用户名 / 仓库名 / Token）');
    return false;
  }
  const path = 'data.json';
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
  const headers = {
    'Authorization': 'token ' + cfg.token,
    'Accept': 'application/vnd.github+json'
  };

  // 1) 读取当前 data.json（含 sha，提交时必须带上）
  const getRes = await fetch(url, { headers });
  if (!getRes.ok) throw new Error('读取 data.json 失败（HTTP ' + getRes.status + '，检查仓库名/分支/Token 权限）');
  const data = await getRes.json();
  const arr = JSON.parse(b64decode(data.content));
  arr.push(entry);

  // 2) 写回
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'diary: ' + entry.date,
      content: b64encode(JSON.stringify(arr, null, 2)),
      sha: data.sha,
      branch: cfg.branch
    })
  });
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error('提交失败（HTTP ' + putRes.status + '）：' + (err.message || ''));
  }
  return true;
}

// 初始化
(function init() {
  const c = loadCfg();
  document.getElementById('cfg-owner').value = c.owner;
  document.getElementById('cfg-repo').value = c.repo;
  document.getElementById('cfg-branch').value = c.branch;
  document.getElementById('save-cfg').addEventListener('click', saveCfg);
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
})();

document.getElementById('diary-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  msg.textContent = '提交中…';
  const entry = {
    date: document.getElementById('f-date').value,
    title: document.getElementById('f-title').value.trim(),
    content: document.getElementById('f-content').value
  };
  if (!entry.content.trim()) {
    msg.textContent = '❌ 正文不能为空';
    return;
  }
  try {
    const ok = await commitEntry(entry);
    if (ok) {
      msg.textContent = '✅ 提交成功！等 1~2 分钟 GitHub Pages 更新后，回到首页刷新即可看到。';
      document.getElementById('f-title').value = '';
      document.getElementById('f-content').value = '';
    }
  } catch (err) {
    msg.textContent = '❌ ' + err.message;
  }
});
