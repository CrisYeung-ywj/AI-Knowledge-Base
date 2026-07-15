let app = null;
let active = null;
let editing = false;
let dirty = false;
let selectedStageIndex = 0;
let selectedRowIndex = 0;

const defaultRows = [
  { id: "nodeGoal", name: "节点目标" },
  { id: "processLink", name: "流程链路" },
  { id: "standards", name: "标准规范" },
  { id: "enablement", name: "赋能计划" },
  { id: "aiTools", name: "AI工具" }
];

const $ = (id) => document.getElementById(id);
const getRows = (department) => department.rows || app.rows || defaultRows;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function setStatus(text) { $("status").textContent = text; }
function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function sheetName(name) { return String(name).replace(/[\\/?*[\]:]/g, "").slice(0, 31); }
function keyFromName(name, index) { return "row-" + (index + 1) + "-" + String(name || "item").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12); }
function isConfiguredDb() { const db = window.PANORAMA_DB || {}; return Boolean(db.supabaseUrl && db.supabaseAnonKey && db.table && db.id); }
function statusHot(progress) { return /^(10|70|100)%/.test(String(progress || "")); }
function cloneRows(rows) { return rows.map((row, index) => ({ id: row.id || keyFromName(row.name, index), name: row.name || "能力维度" })); }

function defaults(department, stage, row) {
  const labels = {
    nodeGoal: ["0%", "待确认", "明确该节点的业务目标、责任边界、输入输出和验收口径。"],
    processLink: ["0%", "待梳理", "需求确认-->资料收集-->方案制定-->执行协同-->验收交付-->复盘沉淀"],
    standards: ["0%", "待定", "需求模板、资源标签、SOP、权限边界、质量验收及版本记录。"],
    enablement: ["0%", "待推进", "团队明确责任人和复盘节奏；AI辅助生成初稿、沉淀案例并分析异常。"],
    aiTools: ["0%", "待接入", "小林AI、钉钉、BI、RPA、行业工具及知识库。"]
  };
  const value = labels[row.id] || ["0%", "待确认", "请补充该能力维度在“" + stage + "”的具体内容。"];
  return { progress: value[0], status: value[1], description: value[2] };
}

function splitLegacyStatus(value) {
  const text = String(value || "").trim();
  const matched = text.match(/^(\d+%)\s*[｜|]?\s*(.*)$/);
  return matched ? { progress: matched[1], status: matched[2] || "待确认" } : { progress: "0%", status: text || "待确认" };
}

function normalizeCell(value, department, stage, row) {
  const fallback = defaults(department, stage, row);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (hasOwn(value, "progress") || hasOwn(value, "description")) {
      return {
        progress: hasOwn(value, "progress") ? String(value.progress ?? "") : fallback.progress,
        status: hasOwn(value, "status") ? String(value.status ?? "") : fallback.status,
        description: hasOwn(value, "description") ? String(value.description ?? "") : fallback.description
      };
    }
    const legacy = splitLegacyStatus(value.status);
    return { progress: legacy.progress, status: legacy.status, description: String(value.text ?? fallback.description) };
  }
  if (typeof value === "string" && value.trim()) {
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const legacy = splitLegacyStatus(lines[0]);
    return { progress: legacy.progress, status: legacy.status, description: lines.slice(1).join("\n") || fallback.description };
  }
  return fallback;
}

function normalize(data) {
  data.rows = Array.isArray(data.rows) && data.rows.length ? cloneRows(data.rows) : cloneRows(defaultRows);
  data.departments = Array.isArray(data.departments) ? data.departments : [];
  data.departments.forEach((department) => {
    department.stages = Array.isArray(department.stages) ? department.stages.filter(Boolean).map(String) : [];
    department.rows = Array.isArray(department.rows) && department.rows.length ? cloneRows(department.rows) : cloneRows(data.rows);
    department.cells = department.cells || {};
    department.stages.forEach((stage) => {
      department.cells[stage] = department.cells[stage] || {};
      department.rows.forEach((row) => {
        department.cells[stage][row.id] = normalizeCell(department.cells[stage][row.id], department, stage, row);
      });
    });
  });
  return data;
}

async function loadJsonData() {
  const response = await fetch("./data.json?v=" + Date.now(), { cache: "no-store" });
  if (!response.ok) throw new Error("无法读取 data.json");
  return response.json();
}

async function loadDbData() {
  const db = window.PANORAMA_DB || {};
  const url = `${db.supabaseUrl}/rest/v1/${db.table}?id=eq.${encodeURIComponent(db.id)}&select=data`;
  const response = await fetch(url, { headers: { apikey: db.supabaseAnonKey, Authorization: `Bearer ${db.supabaseAnonKey}` } });
  if (!response.ok) throw new Error("数据库读取失败：" + response.status);
  const rows = await response.json();
  return rows[0]?.data || null;
}

async function loadData() {
  const jsonData = await loadJsonData();
  const dbData = isConfiguredDb() ? await loadDbData().catch(() => null) : null;
  app = normalize(dbData || jsonData);
  active = app.departments.find((department) => department.name === "产品中心") || app.departments[0];
  render();
  setStatus(dbData ? "已加载数据库数据" : "已加载初始数据");
}

function render() {
  renderDepartments();
  renderSummary();
  renderChain();
  renderMatrix();
}

function renderDepartments() {
  $("deptGrid").innerHTML = app.departments.map((department, index) => `<button class="dept-card ${department === active ? "active" : ""}" data-department="${index}"><b>${esc(department.name)}</b><span>${department.people}人｜${esc(department.line)}</span></button>`).join("");
  $("deptGrid").querySelectorAll("button").forEach((button) => {
    button.onclick = () => {
      active = app.departments[Number(button.dataset.department)];
      selectedStageIndex = 0;
      selectedRowIndex = 0;
      render();
    };
  });
}

function renderSummary() {
  $("deptName").textContent = active.name;
  $("deptRole").textContent = `${active.people}人｜${active.line}｜${active.role}`;
  $("deptFocus").textContent = active.focus;
  $("deptFocusText").textContent = active.focusText;
}

function renderChain() {
  $("chainStrip").innerHTML = app.mainChain.map((item, index) => `<div class="chain-step ${active.links.includes(index) ? "active" : ""}" style="${active.links.includes(index) ? "border-color:" + active.color : ""}"><b>${esc(item.name)}</b><span>${esc(item.desc)}</span></div>`).join("");
}

function editable() { return editing ? ' contenteditable="true" spellcheck="false"' : ""; }
function ensureCell(stage, row) {
  active.cells[stage] = active.cells[stage] || {};
  active.cells[stage][row.id] = normalizeCell(active.cells[stage][row.id], active, stage, row);
  return active.cells[stage][row.id];
}

function renderMatrix() {
  const stages = active.stages;
  const rows = getRows(active);
  selectedStageIndex = Math.max(0, Math.min(selectedStageIndex, Math.max(stages.length - 1, 0)));
  selectedRowIndex = Math.max(0, Math.min(selectedRowIndex, Math.max(rows.length - 1, 0)));
  const matrix = $("rolloutMatrix");
  matrix.style.gridTemplateColumns = `132px repeat(${stages.length}, minmax(0, 1fr))`;
  matrix.innerHTML = '<div class="matrix-head">能力维度</div>' +
    stages.map((stage, index) => `<div class="matrix-head stage-head ${editing && index === selectedStageIndex ? "selected" : ""}" data-stage-index="${index}"${editable()}>${esc(stage)}</div>`).join("") +
    rows.map((row, rowIndex) => `<div class="row-head editable-row ${editing && rowIndex === selectedRowIndex ? "selected" : ""}" data-row-index="${rowIndex}"${editable()}>${esc(row.name)}</div>` +
      stages.map((stage) => {
        const cell = ensureCell(stage, row);
        return `<div class="cell" data-stage="${esc(stage)}" data-row-id="${esc(row.id)}">
          <div class="cell-meta">
            <span class="cell-progress ${statusHot(cell.progress) ? "hot" : ""}" data-field="progress"${editable()}>${esc(cell.progress)}</span>
            <span class="cell-status" data-field="status"${editable()}>${esc(cell.status)}</span>
          </div>
          <span class="cell-body" data-field="description"${editable()}>${esc(cell.description)}</span>
        </div>`;
      }).join("")
    ).join("");
}

function markDirty(message = "已修改，待保存") {
  dirty = true;
  setStatus(message);
}

$("rolloutMatrix").addEventListener("input", (event) => {
  if (!editing) return;
  const field = event.target.closest("[data-field]");
  const cell = event.target.closest(".cell");
  if (!field || !cell) return;
  const stage = cell.dataset.stage;
  const row = getRows(active).find((item) => item.id === cell.dataset.rowId);
  if (!row) return;
  ensureCell(stage, row)[field.dataset.field] = event.target.innerText.trim();
  markDirty();
});

$("rolloutMatrix").addEventListener("blur", (event) => {
  if (!editing) return;
  const stageHead = event.target.closest(".stage-head");
  if (stageHead) {
    const index = Number(stageHead.dataset.stageIndex);
    const oldStage = active.stages[index];
    const nextStage = stageHead.innerText.trim() || oldStage;
    if (nextStage !== oldStage && !active.stages.includes(nextStage)) {
      active.stages[index] = nextStage;
      active.cells[nextStage] = active.cells[oldStage] || {};
      delete active.cells[oldStage];
      markDirty("已修改列标题，待保存");
      renderMatrix();
    }
    return;
  }
  const rowHead = event.target.closest(".editable-row");
  if (rowHead) {
    const row = getRows(active)[Number(rowHead.dataset.rowIndex)];
    const nextName = rowHead.innerText.trim() || row.name;
    if (nextName !== row.name) {
      row.name = nextName;
      markDirty("已修改行标题，待保存");
    }
  }
}, true);

$("rolloutMatrix").addEventListener("click", (event) => {
  if (!editing) return;
  const stageHead = event.target.closest(".stage-head");
  const rowHead = event.target.closest(".editable-row");
  if (stageHead) {
    selectedStageIndex = Number(stageHead.dataset.stageIndex);
    $("rolloutMatrix").querySelectorAll(".stage-head").forEach((item) => item.classList.toggle("selected", Number(item.dataset.stageIndex) === selectedStageIndex));
  }
  if (rowHead) {
    selectedRowIndex = Number(rowHead.dataset.rowIndex);
    $("rolloutMatrix").querySelectorAll(".editable-row").forEach((item) => item.classList.toggle("selected", Number(item.dataset.rowIndex) === selectedRowIndex));
  }
});

function updateEditState() {
  document.body.classList.toggle("editing", editing);
  $("onlineEditBtn").classList.toggle("active", editing);
  $("editControls").hidden = !editing;
  $("onlineEditBtn").textContent = editing ? "完成修改" : "在线修改";
}

$("onlineEditBtn").onclick = () => {
  editing = !editing;
  updateEditState();
  renderMatrix();
  setStatus(editing ? "在线修改中：可编辑单元格、行列标题，也可新增或删除行列" : "已退出在线修改");
};

function nextName(base, values) {
  let index = 1;
  let candidate = base;
  while (values.includes(candidate)) candidate = base + index++;
  return candidate;
}

$("addColumnBtn").onclick = () => {
  const stage = nextName("新流程节点", active.stages);
  active.stages.push(stage);
  active.cells[stage] = {};
  getRows(active).forEach((row) => { active.cells[stage][row.id] = defaults(active, stage, row); });
  selectedStageIndex = active.stages.length - 1;
  markDirty("已新增列，待保存");
  renderMatrix();
};

$("deleteColumnBtn").onclick = () => {
  if (!active.stages.length) return;
  const stage = active.stages[selectedStageIndex];
  active.stages.splice(selectedStageIndex, 1);
  delete active.cells[stage];
  selectedStageIndex = Math.max(0, selectedStageIndex - 1);
  markDirty("已删除列，待保存");
  renderMatrix();
};

$("addRowBtn").onclick = () => {
  const rows = getRows(active);
  const row = { id: "row-" + Date.now(), name: nextName("新能力维度", rows.map((item) => item.name)) };
  active.rows = rows;
  active.rows.push(row);
  active.stages.forEach((stage) => { active.cells[stage][row.id] = defaults(active, stage, row); });
  selectedRowIndex = active.rows.length - 1;
  markDirty("已新增行，待保存");
  renderMatrix();
  requestAnimationFrame(() => $("rolloutMatrix").scrollIntoView({ block: "end", behavior: "smooth" }));
};

$("deleteRowBtn").onclick = () => {
  const rows = getRows(active);
  if (rows.length <= 1) {
    setStatus("至少需要保留一行");
    return;
  }
  const row = rows[selectedRowIndex];
  rows.splice(selectedRowIndex, 1);
  active.stages.forEach((stage) => delete active.cells[stage][row.id]);
  selectedRowIndex = Math.max(0, selectedRowIndex - 1);
  markDirty("已删除行，待保存");
  renderMatrix();
};

function cellValues(department, stage, row) {
  const cell = normalizeCell(department.cells?.[stage]?.[row.id], department, stage, row);
  return [cell.progress, cell.status, cell.description];
}

function buildWorkbook() {
  if (!window.XLSX) {
    alert("Excel 模块未加载，请检查网络");
    return null;
  }
  const workbook = XLSX.utils.book_new();
  app.departments.forEach((department) => {
    const data = [["能力维度", ...department.stages]];
    const merges = [];
    getRows(department).forEach((row) => {
      const startRow = data.length;
      data.push([row.name, ...department.stages.map((stage) => cellValues(department, stage, row)[0])]);
      data.push(["", ...department.stages.map((stage) => cellValues(department, stage, row)[1])]);
      data.push(["", ...department.stages.map((stage) => cellValues(department, stage, row)[2])]);
      merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow + 2, c: 0 } });
    });
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const border = { top: { style: "thin", color: { rgb: "D9E0E0" } }, bottom: { style: "thin", color: { rgb: "D9E0E0" } }, left: { style: "thin", color: { rgb: "D9E0E0" } }, right: { style: "thin", color: { rgb: "D9E0E0" } } };
    data.forEach((line, rowIndex) => {
      line.forEach((_, columnIndex) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
        if (!cell) return;
        cell.s = {
          alignment: { vertical: "center", horizontal: rowIndex === 0 || columnIndex === 0 ? "center" : "left", wrapText: true },
          border,
          font: rowIndex === 0 || columnIndex === 0 ? { bold: true, color: { rgb: "FFFFFF" } } : { color: { rgb: "1F2A24" } },
          fill: rowIndex === 0 || columnIndex === 0 ? { fgColor: { rgb: "0F737B" } } : { fgColor: { rgb: "FFFFFF" } }
        };
      });
    });
    sheet["!merges"] = merges;
    sheet["!cols"] = [{ wch: 16 }, ...department.stages.map(() => ({ wch: 34 }))];
    sheet["!rows"] = data.map((_, rowIndex) => {
      if (rowIndex === 0) return { hpt: 25 };
      return { hpt: (rowIndex - 1) % 3 === 2 ? 62 : 22 };
    });
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(department.name));
  });
  return workbook;
}

function downloadWorkbook(filename) {
  const workbook = buildWorkbook();
  if (workbook) {
    XLSX.writeFile(workbook, filename);
    setStatus("已导出 Excel");
  }
}

$("exportBtn").onclick = () => downloadWorkbook("AI赋能全景图_全部门.xlsx");
$("downloadTemplateBtn").onclick = () => downloadWorkbook("AI赋能全景图_导入模板.xlsx");

function structuredGroups(header, fields) {
  const groups = [];
  let currentStage = "";
  for (let column = 1; column < Math.max(header.length, fields.length); column += 1) {
    const stageValue = String(header[column] ?? "").trim();
    if (stageValue) currentStage = stageValue;
    const field = String(fields[column] ?? "").trim();
    if (!currentStage || !["进度", "状态", "描述"].includes(field)) continue;
    let group = groups.find((item) => item.name === currentStage);
    if (!group) {
      group = { name: currentStage, columns: {} };
      groups.push(group);
    }
    group.columns[field] = column;
  }
  return groups.filter((group) => Object.keys(group.columns).length);
}

function importStructuredSheet(department, table) {
  const stages = (table[0] || []).slice(1).map((value) => String(value ?? "").trim()).filter(Boolean);
  if (stages.length && table.length >= 4 && !["进度", "状态", "描述"].some((field) => (table[1] || []).includes(field))) {
    const rows = [];
    const cells = {};
    stages.forEach((stage) => { cells[stage] = {}; });
    for (let rowIndex = 1; rowIndex + 2 < table.length; rowIndex += 3) {
      const name = String(table[rowIndex][0] ?? "").trim();
      if (!name) continue;
      const row = { id: keyFromName(name, rows.length), name };
      rows.push(row);
      stages.forEach((stage, stageIndex) => {
        cells[stage][row.id] = {
          progress: String(table[rowIndex][stageIndex + 1] ?? "").trim(),
          status: String(table[rowIndex + 1][stageIndex + 1] ?? "").trim(),
          description: String(table[rowIndex + 2][stageIndex + 1] ?? "").trim()
        };
      });
    }
    if (rows.length) {
      department.stages = stages;
      department.rows = rows;
      department.cells = cells;
      return true;
    }
  }
  const groups = structuredGroups(table[0] || [], table[1] || []);
  if (!groups.length) return false;
  department.stages = groups.map((group) => group.name);
  department.rows = [];
  department.cells = {};
  department.stages.forEach((stage) => { department.cells[stage] = {}; });
  table.slice(2).forEach((line, index) => {
    const name = String(line[0] ?? "").trim();
    if (!name) return;
    const row = { id: keyFromName(name, index), name };
    department.rows.push(row);
    groups.forEach((group) => {
      department.cells[group.name][row.id] = {
        progress: String(line[group.columns.进度] ?? "").trim(),
        status: String(line[group.columns.状态] ?? "").trim(),
        description: String(line[group.columns.描述] ?? "").trim()
      };
    });
  });
  return true;
}

function importLegacySheet(department, table) {
  const stages = (table[0] || []).slice(1).map((value) => String(value).trim()).filter(Boolean);
  if (!stages.length) return false;
  department.stages = stages;
  department.rows = [];
  department.cells = {};
  stages.forEach((stage) => { department.cells[stage] = {}; });
  table.slice(1).forEach((line, index) => {
    const name = String(line[0] ?? "").trim();
    if (!name) return;
    const row = { id: keyFromName(name, index), name };
    department.rows.push(row);
    stages.forEach((stage, stageIndex) => {
      department.cells[stage][row.id] = normalizeCell(String(line[stageIndex + 1] ?? ""), department, stage, row);
    });
  });
  return true;
}

async function importExcel(file) {
  if (!window.XLSX) {
    alert("Excel 模块未加载，请检查网络");
    return;
  }
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  let count = 0;
  workbook.SheetNames.forEach((name) => {
    const department = app.departments.find((item) => item.name === name || sheetName(item.name) === name);
    if (!department) return;
    const table = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" });
    if (!table.length) return;
    const imported = importStructuredSheet(department, table) || importLegacySheet(department, table);
    if (imported) count += 1;
  });
  if (!count) {
    setStatus("未识别到与一级部门同名的 Sheet");
    return;
  }
  app = normalize(app);
  editing = true;
  updateEditState();
  markDirty(`已导入 ${count} 个 Sheet，待保存`);
  render();
}

$("importBtn").onclick = () => { $("importModal").hidden = false; };
$("closeImportModalBtn").onclick = () => { $("importModal").hidden = true; };
$("chooseImportBtn").onclick = () => $("excelImport").click();
$("excelImport").onchange = (event) => {
  const file = event.target.files[0];
  if (file) importExcel(file).finally(() => { $("importModal").hidden = true; });
  event.target.value = "";
};

async function saveDb() {
  const db = window.PANORAMA_DB || {};
  const url = `${db.supabaseUrl}/rest/v1/${db.table}`;
  app.updatedAt = new Date().toISOString();
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: db.supabaseAnonKey, Authorization: `Bearer ${db.supabaseAnonKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: db.id, data: app, updated_at: app.updatedAt })
  });
  if (!response.ok) throw new Error("数据库保存失败：" + response.status);
}

$("saveBtn").onclick = async () => {
  if (!isConfiguredDb()) {
    setStatus("请在 Vercel 页面使用保存更新");
    return;
  }
  try {
    setStatus("保存中...");
    await saveDb();
    dirty = false;
    setStatus("已保存到数据库");
  } catch (error) {
    alert(error.message);
    setStatus("保存失败");
  }
};

window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

loadData().catch((error) => {
  console.error(error);
  setStatus("加载失败");
  alert(error.message);
});
