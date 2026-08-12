const statusOutput = document.querySelector('#status'); // 健康与导入状态区域。
const answerOutput = document.querySelector('#answer'); // 回答、引用和 Trace 区域。

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options }); // API 原始响应。
  const payload = await response.json(); // JSON 响应对象。
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

document.querySelector('#health').addEventListener('click', async () => {
  try { statusOutput.textContent = JSON.stringify(await request('/health'), null, 2); }
  catch (error) { statusOutput.textContent = error.message; }
});

document.querySelector('#import').addEventListener('click', async () => {
  statusOutput.textContent = '正在重建 collection 并导入...';
  try { statusOutput.textContent = JSON.stringify(await request('/api/knowledge/import-agent-manual', { method: 'POST', body: '{}' }), null, 2); }
  catch (error) { statusOutput.textContent = error.message; }
});

document.querySelector('#add').addEventListener('click', async () => {
  const payload = { title: document.querySelector('#title').value, source: document.querySelector('#source').value, text: document.querySelector('#text').value }; // 手工文档对象。
  try { statusOutput.textContent = JSON.stringify(await request('/api/knowledge/documents', { method: 'POST', body: JSON.stringify(payload) }), null, 2); }
  catch (error) { statusOutput.textContent = error.message; }
});

document.querySelector('#ask').addEventListener('click', async () => {
  const question = document.querySelector('#question').value.trim(); // 清洗后的问答查询。
  answerOutput.textContent = '正在向量检索...';
  try { answerOutput.textContent = JSON.stringify(await request('/api/rag/chat', { method: 'POST', body: JSON.stringify({ question, topK: 4 }) }), null, 2); }
  catch (error) { answerOutput.textContent = error.message; }
});
