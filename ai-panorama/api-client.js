(function () {
  const configured = (window.PANORAMA_API || {}).endpoint || "";
  const endpoint = configured.replace(/\/$/, "") || (location.hostname.endsWith(".vercel.app") ? "/api/panorama" : "");
  if (!endpoint) return;

  const byId = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  function closeSaveModal() {
    byId("saveModal").hidden = true;
    byId("editKeyInput").value = "";
  }

  byId("saveBtn").onclick = () => {
    byId("saveModal").hidden = false;
    byId("editKeyInput").focus();
  };
  byId("closeSaveModalBtn").onclick = closeSaveModal;
  byId("cancelSaveBtn").onclick = closeSaveModal;

  byId("confirmSaveBtn").onclick = async () => {
    const editKey = byId("editKeyInput").value.trim();
    if (!editKey) {
      byId("editKeyInput").focus();
      setStatus("请输入更新密钥");
      return;
    }
    try {
      byId("confirmSaveBtn").disabled = true;
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
      closeSaveModal();
      setStatus("已保存并同步给所有访问者");
    } catch (error) {
      console.error(error);
      alert(error.message);
      setStatus("保存失败");
    } finally {
      byId("confirmSaveBtn").disabled = false;
    }
  };

  loadRemoteData().catch((error) => {
    console.warn(error);
    setStatus("云端数据暂不可用，当前显示本地草稿");
  });
})();
