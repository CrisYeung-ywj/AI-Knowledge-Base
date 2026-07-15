(function () {
  const configured = (window.PANORAMA_API || {}).endpoint || "";
  const endpoint = configured.replace(/\/$/, "") || (location.hostname.endsWith(".vercel.app") ? "/api/panorama" : "");
  if (!endpoint) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const editKeyInput = document.getElementById("editKeyInput");

  async function waitForInitialData() {
    for (let index = 0; index < 100; index += 1) {
      if (app) return;
      await sleep(50);
    }
    throw new Error("初始数据加载超时");
  }

  async function loadRemoteData() {
    await waitForInitialData();
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("数据库读取失败：" + response.status);
    const payload = await response.json();
    if (!payload.data) return;
    app = normalize(payload.data);
    active = app.departments.find((department) => department.name === active?.name) || app.departments[0];
    dirty = false;
    render();
    setStatus("已加载云端数据" + (payload.updatedAt ? "（已同步）" : ""));
  }

  saveBtn.onclick = async () => {
    const editKey = editKeyInput?.value.trim();
    if (!editKey) {
      setStatus("请输入更新口令后再保存");
      editKeyInput?.focus();
      return;
    }

    try {
      setStatus("保存中...");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Panorama-Edit-Key": editKey },
        body: JSON.stringify({ data: app })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "保存失败：" + response.status);
      app.updatedAt = payload.updatedAt;
      dirty = false;
      setStatus("已保存并同步给所有访问者");
    } catch (error) {
      console.error(error);
      alert(error.message);
      setStatus("保存失败");
    }
  };

  loadRemoteData().catch((error) => {
    console.warn(error);
    setStatus("云端数据暂不可用，当前显示静态数据");
  });
})();
