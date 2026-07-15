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

  function updateUpdatedAt(value) {
    byId("updatedAt").textContent = "最近更新：" + formatTime(value);
  }

  let historySnapshot = null;
  let historySnapshotId = null;

  function closeHistoryModal() {
    byId("historyModal").hidden = true;
    byId("historyPreview").hidden = true;
    historySnapshot = null;
    historySnapshotId = null;
  }

  function renderHistoryPreview() {
    const container = byId("historyPreview");
    if (!historySnapshot) {
      container.hidden = true;
      return;
    }
    const department = historySnapshot.departments.find((item) => item.name === active?.name) || historySnapshot.departments[0];
    if (!department) {
      container.hidden = true;
      return;
    }
    const rows = department.rows || historySnapshot.rows || [];
    const stageHeads = department.stages.map((stage) => "<th>" + esc(stage) + "</th>").join("");
    const bodyRows = rows.map((row) => {
      const cells = department.stages.map((stage) => {
        const cell = department.cells?.[stage]?.[row.id] || {};
        return "<td><b>" + esc(cell.progress || "0%") + " " + esc(cell.status || "") + "</b><span>" + esc(cell.description || "") + "</span></td>";
      }).join("");
      return "<tr><th>" + esc(row.name) + "</th>" + cells + "</tr>";
    }).join("");
    const options = historySnapshot.departments.map((item) => "<option value=\"" + esc(item.name) + "\" " + (item.name === department.name ? "selected" : "") + ">" + esc(item.name) + "</option>").join("");
    container.innerHTML = "<div class=\"history-preview-head\"><b>版本 " + historySnapshotId + " 快照</b><label>查看部门 <select id=\"historyDepartmentSelect\">" + options + "</select></label></div><div class=\"history-table-wrap\"><table><thead><tr><th>能力维度</th>" + stageHeads + "</tr></thead><tbody>" + bodyRows + "</tbody></table></div>";
    byId("historyDepartmentSelect").onchange = (event) => {
      active = historySnapshot.departments.find((item) => item.name === event.target.value) || department;
      renderHistoryPreview();
    };
    container.hidden = false;
  }

  async function loadHistoryVersion(id) {
    const response = await fetch(endpoint + "?version=" + encodeURIComponent(id), { cache: "no-store" });
    if (!response.ok) throw new Error("历史版本读取失败：" + response.status);
    const payload = await response.json();
    if (!payload.version?.data) throw new Error("未找到该历史版本");
    return payload.version;
  }

  async function showHistory() {
    byId("historyModal").hidden = false;
    byId("historyPreview").hidden = true;
    byId("historyList").textContent = "正在读取历史版本...";
    const response = await fetch(endpoint + "?history=1", { cache: "no-store" });
    if (!response.ok) throw new Error("历史版本读取失败：" + response.status);
    const payload = await response.json();
    const versions = payload.versions || [];
    if (!versions.length) {
      byId("historyList").textContent = "暂未生成历史版本。首次保存更新后会自动创建。";
      return;
    }
    byId("historyList").innerHTML = versions.map((version) => "<div class=\"history-item\"><div><b>版本 " + esc(version.id) + "</b><span>" + formatTime(version.created_at) + "</span></div><div><button data-history-view=\"" + esc(version.id) + "\">查看快照</button><button class=\"primary\" data-history-restore=\"" + esc(version.id) + "\">恢复为草稿</button></div></div>").join("");
    byId("historyList").querySelectorAll("[data-history-view]").forEach((button) => {
      button.onclick = async () => {
        try {
          button.disabled = true;
          const version = await loadHistoryVersion(button.dataset.historyView);
          historySnapshot = normalize(version.data);
          historySnapshotId = version.id;
          renderHistoryPreview();
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

  loadRemoteData().catch((error) => {
    console.warn(error);
    setStatus("云端数据暂不可用，当前显示本地草稿");
  });
})();
