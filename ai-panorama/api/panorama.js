module.exports = async (req, res) => {
  const origin = process.env.PANORAMA_ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Panorama-Edit-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: "服务端数据库尚未配置" });
  }

  const rest = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  if (req.method === "GET") {
    if (req.query.history === "1") {
      const response = await fetch(`${rest}/ai_panorama_versions?select=id,created_at&order=created_at.desc&limit=100`, { headers });
      if (!response.ok) return res.status(response.status).json({ error: await response.text() });
      return res.status(200).json({ versions: await response.json() });
    }

    if (req.query.version) {
      const response = await fetch(`${rest}/ai_panorama_versions?id=eq.${encodeURIComponent(req.query.version)}&select=id,data,created_at`, { headers });
      if (!response.ok) return res.status(response.status).json({ error: await response.text() });
      const rows = await response.json();
      return res.status(200).json({ version: rows[0] || null });
    }

    const response = await fetch(`${rest}/ai_panorama_data?id=eq.default&select=data,updated_at`, { headers });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const rows = await response.json();
    return res.status(200).json({ data: rows[0]?.data || null, updatedAt: rows[0]?.updated_at || null });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "只支持 GET 和 POST" });
  if (!process.env.PANORAMA_EDIT_KEY || req.headers["x-panorama-edit-key"] !== process.env.PANORAMA_EDIT_KEY) {
    return res.status(401).json({ error: "更新密钥不正确" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "请求数据格式错误" }); }
  }
  if (!body?.data || !Array.isArray(body.data.departments)) {
    return res.status(400).json({ error: "全景图数据格式错误" });
  }

  const response = await fetch(`${rest}/rpc/save_ai_panorama_version`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_data: body.data })
  });
  if (!response.ok) return res.status(response.status).json({ error: await response.text() });
  const result = await response.json();
  const saved = Array.isArray(result) ? result[0] : result;
  return res.status(200).json({ ok: true, versionId: saved?.version_id || null, updatedAt: saved?.updated_at || new Date().toISOString() });
};
