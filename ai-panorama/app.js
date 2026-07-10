const GITHUB = { owner: 'CrisYeung-ywj', repo: 'AI-Knowledge-Base', branch: 'main', path: 'ai-panorama/data.json' };
let app = null;
let active = null;
let editing = false;
let dirty = false;

const processMap = {
  '产品规划':'市场洞察-->品类机会-->价格带/SKU规划-->立项评审-->开发排期-->上市目标-->复盘',
  '研发设计':'趋势研究-->结构设计-->材料方案-->打样评审-->安全/环保测试-->量产图纸-->上市交接',
  '视觉拍摄':'需求-->策略输出-->详情版面模块-->资源匹配-->摆场-->拍摄-->图片处理-->描述终稿-->创意脚本-->视频-->剪辑-->发布投放-->复盘沉淀',
  '成本签价':'BOM确认-->供应报价-->成本核算-->毛利测算-->价格评审-->签价归档-->异常复盘',
  '采销协同':'需求预测-->采购计划-->供应商排产-->交期确认-->到货跟进-->异常协同-->复盘',
  '计划调度':'销售预测-->产能评估-->主计划-->滚动排程-->缺料预警-->进度跟踪-->交付复盘',
  '制造运营':'工艺准备-->排产上线-->过程质检-->产能追踪-->异常处理-->入库交接-->效率复盘',
  '品质管控':'标准定义-->来料检验-->过程巡检-->成品抽检-->问题闭环-->质量复盘-->标准更新',
  '售前咨询与转化':'线索进入-->需求识别-->户型/风格推荐-->方案报价-->异议处理-->下单转化-->回访复盘',
  '订单跟单与履约':'订单确认-->生产/库存校验-->配送预约-->安装跟进-->异常预警-->签收确认-->满意度回访',
  '售后服务':'问题受理-->责任判定-->补件/维修方案-->预约执行-->结果确认-->赔付/关单-->案例沉淀',
  '投诉与舆情管理':'投诉识别-->分级定责-->响应话术-->处理方案-->升级协同-->结案回访-->舆情复盘',
  'VOC与质量管理':'VOC采集-->标签分类-->问题归因-->改善立项-->验证追踪-->质量看板-->复盘迭代',
  '招商建店':'城市评估-->渠道线索-->资质审核-->店型匹配-->合同签约-->开业筹备-->经营复盘',
  '经销管理与赋能':'经营诊断-->目标拆解-->培训赋能-->活动协同-->数据跟踪-->问题辅导-->复盘',
  '流量运营':'目标设定-->人群包-->内容/货品组合-->投放计划-->素材测试-->数据调优-->沉淀复盘',
  '客户接待':'进店识别-->需求问诊-->风格方案-->体验讲解-->报价协商-->留资跟进-->成交复盘',
  '成交转化':'线索分层-->方案确认-->报价权益-->异议处理-->合同/订单-->支付转化-->复盘',
  '订单履约':'订单确认-->排产/库存校验-->物流预约-->安装交付-->异常处理-->签收确认-->回访',
  '经销结算':'订单核对-->返利/费用计算-->对账确认-->开票付款-->异常处理-->归档',
  '经营分析':'指标定义-->数据取数-->异常识别-->原因拆解-->策略建议-->行动跟踪-->复盘',
  '商品知识管理':'SKU资料收集-->卖点提炼-->参数维护-->FAQ沉淀-->渠道同步-->版本更新-->反馈修订',
  '商品素材':'拍摄计划-->素材采集-->修图/剪辑-->尺寸适配-->版权校验-->上架分发-->效果复盘',
  '商品上架与信息维护':'资料校验-->标题关键词-->属性填写-->价格库存-->图文发布-->巡检纠错-->版本归档',
  '活动与价格运营':'活动策略-->货品池-->价格权益-->报名配置-->库存风控-->效果监控-->复盘',
  '行业与竞品动态分析':'情报采集-->竞品拆解-->价格/卖点对比-->机会判断-->策略输出-->同步业务-->复盘',
  '用户画像与需求研究':'数据采集-->人群分层-->场景洞察-->需求验证-->画像更新-->应用追踪-->复盘',
  '营销内容创作':'选题策划-->卖点脚本-->图文/视频生产-->审核发布-->投放分发-->数据复盘-->素材沉淀',
  '组织人事':'组织盘点-->岗位职责-->编制校准-->人岗匹配-->流程审批-->数据维护-->复盘',
  '招聘配置':'需求确认-->JD发布-->简历筛选-->面试评估-->录用审批-->入职交接-->效果复盘',
  '人才发展':'能力模型-->盘点评估-->培养计划-->课程/项目-->跟踪反馈-->晋升应用-->复盘',
  '绩效薪酬':'指标设定-->过程跟踪-->绩效评估-->薪酬核算-->校准审批-->沟通反馈-->归档',
  '员工服务':'问题受理-->政策查询-->流程办理-->进度反馈-->满意度收集-->知识沉淀',
  '行政文化':'需求收集-->活动/制度方案-->资源协调-->执行发布-->反馈收集-->复盘沉淀',
  '业务需求':'业务痛点-->场景定义-->价值评估-->需求入池-->优先级排序-->立项',
  '需求分析':'访谈调研-->流程梳理-->原型说明-->规则定义-->评审确认-->需求基线',
  '方案设计':'目标确认-->架构/流程方案-->数据与权限设计-->评审-->排期-->交付标准',
  '开发测试':'任务拆解-->开发实现-->联调测试-->UAT验收-->缺陷修复-->上线准备',
  '上线运维':'发布计划-->权限配置-->监控巡检-->故障响应-->版本记录-->运维复盘',
  '复盘迭代':'数据回看-->问题归因-->改进假设-->迭代排期-->验证上线-->沉淀模板',
  '物流策略':'网络规划-->仓配能力评估-->成本时效测算-->策略评审-->试点-->复盘',
  '仓储运营':'入库预约-->质检上架-->库存盘点-->拣配复核-->出库交接-->异常处理',
  '末端履约':'订单分配-->干线/支线调度-->预约配送-->安装交付-->签收回传-->异常闭环',
  '售后逆向':'逆向申请-->责任判定-->取件/退仓-->质检处理-->退款/补发-->原因复盘',
  '计费结算':'费用规则-->运单核对-->差异识别-->账单确认-->开票付款-->归档复盘',
  '采购-应付':'采购订单-->到货验收-->发票校验-->应付确认-->付款计划-->异常对账',
  '销售-应收':'销售订单-->开票规则-->应收确认-->回款跟进-->逾期预警-->核销归档',
  '资金/出纳':'资金计划-->付款审批-->收支执行-->银企核对-->日报周报-->风险预警',
  '总账报表':'凭证归集-->科目校验-->结账处理-->报表生成-->口径复核-->经营解释',
  '招商获客':'目标市场-->客户名单-->触达沟通-->资质评估-->方案报价-->签约转化',
  '客户服务管理':'客户建档-->需求响应-->订单协同-->问题处理-->满意度回访-->续单复盘',
  '商品与物料管理':'商品资料-->物料清单-->报价参数-->版本维护-->渠道同步-->异常修订',
  '商品下单':'报价确认-->合同/PI-->订单录入-->库存/交期确认-->付款节点-->下单归档',
  '订单管理':'订单审核-->生产/采购协同-->物流跟进-->变更处理-->交付确认-->复盘',
  '报关管理':'资料准备-->HS编码-->单证审核-->申报-->查验处理-->放行归档',
  '财务与资金管理':'授信评估-->收付款计划-->汇率/费用核算-->对账-->风险预警-->归档'
};

function setStatus(text){ status.textContent = text; }
function esc(value){ return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sheetName(name){ return String(name).replace(/[\\/?*[\]:]/g,'').slice(0,31); }
function isConfiguredDb(){ const db = window.PANORAMA_DB || {}; return Boolean(db.supabaseUrl && db.supabaseAnonKey && db.table && db.id); }
function statusHot(status){ return /^(10|70|100)%/.test(String(status || '')); }

function category(stage){
  if(/视觉|素材|内容|拍摄|营销/.test(stage)) return 'content';
  if(/售前|客户|接待|成交|转化|客服|投诉|VOC|服务/.test(stage)) return 'service';
  if(/订单|履约|仓储|物流|末端|售后逆向|报关|计费/.test(stage)) return 'fulfill';
  if(/经营|结算|资金|应收|应付|财务|报表|成本|签价|价格/.test(stage)) return 'finance';
  if(/组织|招聘|人才|绩效|员工|行政/.test(stage)) return 'org';
  if(/需求|方案|开发|上线|复盘|测试/.test(stage)) return 'it';
  if(/商品|产品|研发|设计|采销|计划|制造|品质|物料/.test(stage)) return 'product';
  return 'operation';
}

function defaultStatus(dept, stage, rowId){
  if(rowId === 'aiTools' && stage === '视觉拍摄') return '70%｜工具验证';
  if(rowId === 'aiTools' && dept.name === '大家居新零售事业部' && stage === '成交转化') return '100%｜已上线';
  if(rowId === 'enablement' && dept.name === '客户服务中心') return '10%｜培训推广中';
  const map = { nodeGoal:'0%｜待确认', processLink:'0%｜待梳理', standards:'0%｜待定', enablement:'0%｜待推进', aiTools:'0%｜待接入' };
  return map[rowId] || '0%｜待启动';
}

function defaultText(dept, stage, rowId){
  const c = category(stage);
  if(stage === '视觉拍摄'){
    if(rowId === 'nodeGoal') return '把商品卖点、空间风格和渠道投放需求转成可复用的图文视频资产。';
    if(rowId === 'standards') return '拍摄需求Brief、风格板、SKU/场景标签、道具清单、版权授权、图片命名、精修验收、投放尺寸规范。';
    if(rowId === 'enablement') return '【视觉中台团队】建立爆款场景模板、自动化批量生成AI视频；【业务团队】沉淀卖点脚本和渠道反馈。';
    if(rowId === 'aiTools') return '小林生影、Lovart、LiblibAI、ComfyUI、可灵官网、剪映、即梦';
  }
  if(rowId === 'processLink') return processMap[stage] || '需求确认-->资料收集-->方案制定-->执行协同-->验收交付-->数据回看-->复盘沉淀';
  if(rowId === 'nodeGoal') return `明确“${stage}”的业务目标、责任边界、输入输出和验收口径，保证家居新零售/电商链路可交付。`;
  const standards = {
    product:'品类机会表、SKU命名规范、BOM/材质参数、价格带模型、样品评审清单、上市验收标准。',
    content:'内容Brief、素材标签、渠道尺寸、版权授权、A/B测试口径、投放命名、效果复盘模板。',
    service:'服务话术库、工单分类、SLA时限、升级规则、质检标准、回访模板、VOC标签。',
    fulfill:'订单状态字典、仓配SOP、异常编码、签收/安装验收、逆向责任判定、结算口径。',
    finance:'费用科目、对账模板、审批权限、发票校验、账龄规则、风险预警阈值、报表口径。',
    org:'岗位职责、流程权限、能力模型、绩效指标、员工服务FAQ、制度版本管理。',
    it:'需求模板、原型规范、接口/权限清单、测试用例、上线检查表、变更记录、复盘模板。',
    operation:'目标拆解表、流程SOP、责任矩阵、验收标准、数据看板、复盘模板。'
  };
  const tools = {
    product:'小林AI、林氏小龙虾、PLM/ERP、BI看板、Excel PowerQuery、ComfyUI',
    content:'小林AI、小林生影、Lovart、LiblibAI、ComfyUI、可灵官网、剪映、巨量算数',
    service:'林氏小龙虾、小林AI、客服知识库、智能质检、钉钉机器人、企微助手',
    fulfill:'小林AI、WMS/TMS/ERP、BI看板、RPA、异常预警助手、钉钉机器人',
    finance:'小林AI、BI、财务系统、RPA、Excel PowerQuery、经营问答助手',
    org:'小林AI、钉钉、知识库、智能问答、培训课件生成、流程机器人',
    it:'小林AI、Codex、低代码平台、需求池、测试用例生成、日志分析助手',
    operation:'小林AI、林氏小龙虾、BI看板、钉钉机器人、Excel PowerQuery'
  };
  if(rowId === 'standards') return standards[c];
  if(rowId === 'aiTools') return tools[c];
  return `【${dept.name}】配置“${stage}”责任人、模板和周复盘；【AI】生成SOP/话术/素材初稿，沉淀案例库并辅助异常分析。`;
}

function normalizeCell(value, dept, stage, rowId){
  if(value && typeof value === 'object' && !Array.isArray(value)){
    return { status: value.status || defaultStatus(dept, stage, rowId), text: value.text || defaultText(dept, stage, rowId) };
  }
  if(typeof value === 'string' && value.trim()){
    const parsed = parseImportedCell(value, dept, stage, rowId);
    return parsed.text ? parsed : { status: defaultStatus(dept, stage, rowId), text: value };
  }
  return { status: defaultStatus(dept, stage, rowId), text: defaultText(dept, stage, rowId) };
}

function normalize(data){
  data.rows = data.rows || [
    {id:'nodeGoal',name:'节点目标'},
    {id:'processLink',name:'流程链路'},
    {id:'standards',name:'标准规范'},
    {id:'enablement',name:'赋能计划'},
    {id:'aiTools',name:'AI工具'}
  ];
  data.departments.forEach(dept => {
    dept.cells = dept.cells || {};
    dept.stages = dept.stages || dept.valueChain || [];
    dept.stages.forEach(stage => {
      dept.cells[stage] = dept.cells[stage] || {};
      data.rows.forEach(row => {
        dept.cells[stage][row.id] = normalizeCell(dept.cells[stage][row.id], dept, stage, row.id);
      });
    });
  });
  return data;
}

async function loadJsonData(){
  const res = await fetch('./data.json?v=' + Date.now(), {cache:'no-store'});
  if(!res.ok) throw new Error('无法读取 data.json');
  return await res.json();
}

async function loadDbData(){
  const db = window.PANORAMA_DB || {};
  const url = `${db.supabaseUrl}/rest/v1/${db.table}?id=eq.${encodeURIComponent(db.id)}&select=data`;
  const res = await fetch(url, {headers:{apikey:db.supabaseAnonKey, Authorization:`Bearer ${db.supabaseAnonKey}`}});
  if(!res.ok) throw new Error('数据库读取失败：' + res.status);
  const rows = await res.json();
  return rows[0]?.data || null;
}

async function loadData(){
  const jsonData = await loadJsonData();
  const dbData = isConfiguredDb() ? await loadDbData().catch(() => null) : null;
  app = normalize(dbData || jsonData);
  active = app.departments.find(d => d.name === '产品中心') || app.departments[0];
  render();
  setStatus(dbData ? '已加载数据库数据' : '已加载静态数据');
}

function render(){ renderDepts(); renderSummary(); renderChain(); renderMatrix(); }
function renderDepts(){
  deptGrid.innerHTML = app.departments.map((dept, index) => `<button class="dept-card ${dept === active ? 'active' : ''}" data-i="${index}"><b>${esc(dept.name)}</b><span>${dept.people}人｜${esc(dept.line)}</span></button>`).join('');
  deptGrid.querySelectorAll('button').forEach(button => button.onclick = () => { active = app.departments[+button.dataset.i]; render(); });
}
function renderSummary(){
  deptName.textContent = active.name;
  deptRole.textContent = `${active.people}人｜${active.line}｜${active.role}`;
  deptFocus.textContent = active.focus;
  deptFocusText.textContent = active.focusText;
}
function renderChain(){
  chainStrip.innerHTML = app.mainChain.map((item, index) => `<div class="chain-step ${active.links.includes(index) ? 'active' : ''}" style="${active.links.includes(index) ? 'border-color:' + active.color : ''}"><b>${esc(item.name)}</b><span>${esc(item.desc)}</span></div>`).join('');
}
function editable(){ return editing ? ' contenteditable="true" spellcheck="false"' : ''; }
function renderMatrix(){
  const stages = active.stages;
  rolloutMatrix.style.gridTemplateColumns = `132px repeat(${stages.length},minmax(0,1fr))`;
  rolloutMatrix.innerHTML = '<div class="matrix-head">能力维度</div>' +
    stages.map((stage, index) => `<div class="matrix-head stage-head" data-stage-index="${index}"${editable()}>${esc(stage)}</div>`).join('') +
    app.rows.map((row, rowIndex) => `<div class="row-head editable-row" data-row-index="${rowIndex}"${editable()}>${esc(row.name)}</div>` +
      stages.map(stage => {
        const current = normalizeCell(active.cells[stage]?.[row.id], active, stage, row.id);
        active.cells[stage] = active.cells[stage] || {};
        active.cells[stage][row.id] = current;
        return `<div class="cell" data-stage="${esc(stage)}" data-row-id="${row.id}"><b class="cell-status ${statusHot(current.status) ? 'hot' : ''}" data-field="status"${editable()}>${esc(current.status)}</b><span class="cell-body" data-field="text"${editable()}>${esc(current.text)}</span></div>`;
      }).join('')
    ).join('');
}

function markDirty(message = '未保存'){ dirty = true; setStatus(message); }
rolloutMatrix.addEventListener('input', event => {
  if(!editing) return;
  const part = event.target.closest('[data-field]');
  const cell = event.target.closest('.cell');
  if(!part || !cell) return;
  const stage = cell.dataset.stage;
  const rowId = cell.dataset.rowId;
  active.cells[stage] = active.cells[stage] || {};
  active.cells[stage][rowId] = normalizeCell(active.cells[stage][rowId], active, stage, rowId);
  active.cells[stage][rowId][part.dataset.field] = part.innerText.trim();
  markDirty('已修改，待保存');
});
rolloutMatrix.addEventListener('blur', event => {
  if(!editing) return;
  const header = event.target.closest('.stage-head');
  if(header){
    const index = +header.dataset.stageIndex;
    const oldStage = active.stages[index];
    const nextStage = header.innerText.trim() || oldStage;
    if(nextStage !== oldStage){
      active.stages[index] = nextStage;
      active.cells[nextStage] = active.cells[oldStage] || {};
      delete active.cells[oldStage];
      markDirty('已修改表头，待保存');
      renderMatrix();
    }
    return;
  }
  const rowHead = event.target.closest('.editable-row');
  if(rowHead){
    const row = app.rows[+rowHead.dataset.rowIndex];
    const nextName = rowHead.innerText.trim() || row.name;
    if(nextName !== row.name){
      row.name = nextName;
      markDirty('已修改行名，待保存');
      renderMatrix();
    }
  }
}, true);

editBtn.onclick = () => {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  editBtn.classList.toggle('active', editing);
  editBtn.textContent = editing ? '退出编辑' : '编辑';
  setStatus(editing ? '编辑模式：修改后请保存' : '已退出编辑');
  renderMatrix();
};

function excelCell(dept, stage, row){
  const current = normalizeCell(dept.cells?.[stage]?.[row.id], dept, stage, row.id);
  return [current.status, current.text].filter(Boolean).join('\n');
}
function buildWorkbook(){
  if(!window.XLSX){ alert('Excel 模块未加载，请检查网络'); return null; }
  const workbook = XLSX.utils.book_new();
  app.departments.forEach(dept => {
    const data = [['能力维度', ...dept.stages]];
    app.rows.forEach(row => data.push([row.name, ...dept.stages.map(stage => excelCell(dept, stage, row))]));
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{wch:14}, ...dept.stages.map(() => ({wch:38}))];
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(dept.name));
  });
  return workbook;
}
exportBtn.onclick = () => {
  const workbook = buildWorkbook();
  if(workbook){ XLSX.writeFile(workbook, 'AI推广全景图_全部门.xlsx'); setStatus('已导出 Excel'); }
};

function rowIdByName(name){
  const exact = app.rows.find(row => row.name === name);
  if(exact) return exact.id;
  const alias = { '知识库':'standards', '标注规范':'standards', '标准规范':'standards', '培训推广':'enablement', 'AI工具':'aiTools' };
  return alias[name] || null;
}
function parseImportedCell(value, dept, stage, rowId){
  const lines = String(value ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if(!lines.length) return normalizeCell(null, dept, stage, rowId);
  const firstLineLooksStatus = /^\d+%\s*[｜|]/.test(lines[0]) || /^\d+%/.test(lines[0]);
  if(firstLineLooksStatus) return { status: lines[0], text: lines.slice(1).join('\n') || defaultText(dept, stage, rowId) };
  return { status: defaultStatus(dept, stage, rowId), text: lines.join('\n') };
}
async function importExcel(file){
  if(!window.XLSX){ alert('Excel 模块未加载，请检查网络'); return; }
  const workbook = XLSX.read(await file.arrayBuffer(), {type:'array'});
  let count = 0;
  workbook.SheetNames.forEach(sheetNameValue => {
    const dept = app.departments.find(item => item.name === sheetNameValue || sheetName(item.name) === sheetNameValue);
    if(!dept) return;
    const table = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameValue], {header:1, defval:''});
    const stages = (table[0] || []).slice(1).map(value => String(value).trim()).filter(Boolean);
    if(stages.length) dept.stages = stages;
    dept.cells = dept.cells || {};
    dept.stages.forEach(stage => dept.cells[stage] = dept.cells[stage] || {});
    table.slice(1).forEach(line => {
      const rowId = rowIdByName(String(line[0] || '').trim());
      if(!rowId) return;
      dept.stages.forEach((stage, index) => {
        const value = String(line[index + 1] ?? '').trim();
        if(value) dept.cells[stage][rowId] = parseImportedCell(value, dept, stage, rowId);
      });
    });
    count += 1;
  });
  editing = true;
  document.body.classList.add('editing');
  editBtn.classList.add('active');
  editBtn.textContent = '退出编辑';
  markDirty(`已导入 ${count} 个 sheet，待保存`);
  render();
}
importBtn.onclick = () => excelImport.click();
excelImport.onchange = event => { const file = event.target.files[0]; if(file) importExcel(file); event.target.value = ''; };

async function saveDb(){
  const db = window.PANORAMA_DB || {};
  const url = `${db.supabaseUrl}/rest/v1/${db.table}`;
  app.updatedAt = new Date().toISOString();
  const res = await fetch(url, {
    method:'POST',
    headers:{apikey:db.supabaseAnonKey, Authorization:`Bearer ${db.supabaseAnonKey}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({id:db.id, data:app, updated_at:app.updatedAt})
  });
  if(!res.ok) throw new Error('数据库保存失败：' + res.status + ' ' + await res.text());
}
saveBtn.onclick = async () => {
  if(!isConfiguredDb()){
    alert('数据库还没配置。请先提供 Supabase URL 和 anon key，我会接到 config.js，之后保存就不会再要求 GitHub token。');
    setStatus('数据库未配置，尚不能远端保存');
    return;
  }
  try{ setStatus('保存中...'); await saveDb(); dirty = false; setStatus('已保存到数据库'); }
  catch(error){ console.error(error); alert(error.message); setStatus('保存失败'); }
};
window.addEventListener('beforeunload', event => { if(dirty){ event.preventDefault(); event.returnValue = ''; } });
loadData().catch(error => { console.error(error); setStatus('加载失败'); alert(error.message); });
