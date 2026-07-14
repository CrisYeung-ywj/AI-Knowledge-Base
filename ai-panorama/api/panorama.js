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

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/ai_panorama_data`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };

  if (req.method === "GET") {
    const response = await fetch(`${endpoint}?id=eq.default&select=data,updated_at`, { headers });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const rows = await response.json();
    return res.status(200).json({ data: rows[0]?.data || null, updatedAt: rows[0]?.updated_at || null });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "只支持 GET 和 POST" });
  if (!process.env.PANORAMA_EDIT_KEY || req.headers["x-panorama-edit-key"] !== process.env.PANORAMA_EDIT_KEY) {
    return res.status(401).json({ error: "更新口令不正确" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "请求数据格式错误" }); }
  }
  if (!body?.data || !Array.isArray(body.data.departments)) {
    return res.status(400).json({ error: "全景图数据格式错误" });
  }

  const updatedAt = new Date().toISOString();
  const response = await fetch(`${endpoint}?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ id: "default", data: body.data, updated_at: updatedAt }])
  });
  if (!response.ok) return res.status(response.status).json({ error: await response.text() });
  return res.status(200).json({ ok: true, updatedAt });
};
