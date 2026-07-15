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
    app.updatedAt = payload.updatedAt || app.updatedAt || null;
    savedApp = cloneData(app);
    active = app.departments.find((department) => department.name === active?.name) || app.departments[0];
    dirty = false;
    render();
    updateUpdatedAt(app.updatedAt);
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
      savedApp = cloneData(app);
      dirty = false;
      updateUpdatedAt(app.updatedAt);
      closeSaveModal();
      setStatus("已保存并同步给所有访问者（已生成历史快照）");
    } catch (error) {
      console.error(error);
      alert(error.message);
      setStatus("保存失败");
    } finally {
      byId("confirmSaveBtn").disabled = false;
    }
  };

  function formatTime(value) {
    if (!value) return "暂无";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "暂无";
    return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\//g, "-");
  }

  function updateUpdatedAt(value, label = "最近更新") {
    const text = label + "：" + formatTime(value);
    byId("updatedAt").textContent = text;
    byId("updatedAt").title = text;
  }

  let liveApp = null;
  let historyMode = false;
  let historyView = null;

  function updateHistoryMode() {
    document.body.classList.toggle("history-mode", historyMode);
    byId("exitHistoryBtn").hidden = !historyMode;
    byId("historyBtn").hidden = historyMode;
    updateEditState();
  }

  function closeHistoryModal() {
    byId("historyModal").hidden = true;
  }

  async function loadHistoryVersion(id) {
    const response = await fetch(endpoint + "?version=" + encodeURIComponent(id), { cache: "no-store" });
    if (!response.ok) throw new Error("历史版本读取失败：" + response.status);
    const payload = await response.json();
    if (!payload.version?.data) throw new Error("未找到该历史版本");
    return payload.version;
  }

  function enterHistoryView(version) {
    liveApp = app;
    const currentName = active?.name;
    app = normalize(version.data);
    active = app.departments.find((item) => item.name === currentName) || app.departments[0];
    historyMode = true;
    historyView = version;
    editing = false;
    updateHistoryMode();
    render();
    updateUpdatedAt(version.created_at, "正在查看历史版本 #" + version.id);
    setStatus("历史版本查看模式：仅查看，不会修改当前草稿");
  }

  function exitHistoryView() {
    if (!historyMode) return;
    const currentName = active?.name;
    app = liveApp;
    active = app.departments.find((item) => item.name === currentName) || app.departments[0];
    liveApp = null;
    historyView = null;
    historyMode = false;
    editing = false;
    updateHistoryMode();
    render();
    updateUpdatedAt(app.updatedAt);
    setStatus(dirty ? "已返回当前草稿，修改仍待保存" : "已返回当前版本");
  }

  async function showHistory() {
    byId("historyModal").hidden = false;
    byId("historyList").textContent = "正在读取历史版本...";
    const response = await fetch(endpoint + "?history=1", { cache: "no-store" });
    if (!response.ok) throw new Error("历史版本读取失败：" + response.status);
    const payload = await response.json();
    const versions = payload.versions || [];
    if (!versions.length) {
      byId("historyList").textContent = "暂未生成历史版本。首次保存更新后会自动创建。";
      return;
    }
    byId("historyList").innerHTML = versions.map((version) => '<div class="history-item"><div><b>版本 ' + esc(version.id) + '</b><span>' + formatTime(version.created_at) + '</span></div><div><button data-history-view="' + esc(version.id) + '">进入查看</button><button class="primary" data-history-restore="' + esc(version.id) + '">恢复为草稿</button></div></div>').join("");
    byId("historyList").querySelectorAll("[data-history-view]").forEach((button) => {
      button.onclick = async () => {
        try {
          button.disabled = true;
          const version = await loadHistoryVersion(button.dataset.historyView);
          closeHistoryModal();
          enterHistoryView(version);
        } catch (error) {
          alert(error.message);
        } finally {
          button.disabled = false;
        }
      };
    });
    byId("historyList").querySelectorAll("[data-history-restore]").forEach((button) => {
      button.onclick = async () => {
        if (!confirm("恢复后将替换当前页面草稿，尚未保存的修改会丢失。是否继续？")) return;
        try {
          button.disabled = true;
          const version = await loadHistoryVersion(button.dataset.historyRestore);
          const currentName = active?.name;
          app = normalize(version.data);
          active = app.departments.find((item) => item.name === currentName) || app.departments[0];
          app.updatedAt = null;
          dirty = true;
          editing = true;
          updateEditState();
          render();
          closeHistoryModal();
          updateUpdatedAt(null);
          setStatus("已恢复版本 " + version.id + " 为草稿，请点击保存更新发布");
        } catch (error) {
          alert(error.message);
        } finally {
          button.disabled = false;
        }
      };
    });
  }

  byId("historyBtn").onclick = () => {
    showHistory().catch((error) => {
      console.error(error);
      alert(error.message);
      byId("historyList").textContent = "历史版本读取失败";
    });
  };
  byId("closeHistoryModalBtn").onclick = closeHistoryModal;
  byId("exitHistoryBtn").onclick = exitHistoryView;

  const statusNode = byId("status");
  if (statusNode) {
    const statusObserver = new MutationObserver(() => { statusNode.title = statusNode.textContent; });
    statusObserver.observe(statusNode, { childList: true, characterData: true, subtree: true });
  }

  loadRemoteData().catch((error) => {
    console.warn(error);
    setStatus("云端数据暂不可用，当前显示本地草稿");
  });
})();
