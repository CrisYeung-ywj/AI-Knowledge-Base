# AI 推广全景图

这个文件夹放置林氏小龙虾 AI 推广全景图的独立页面。

## 文件

- `index.html`：可直接打开的单页工具。

## 能力

- 切换 11 个一级部门查看对应全景图。
- 点击“编辑表格”后，可直接修改矩阵单元格内容。
- 支持下载 Excel 模板。
- 支持导入 Excel 更新各部门表格。
- 支持导出全部一级部门 Excel，每个部门一个 sheet。
- 修改默认保存在浏览器本地 `localStorage`。

## 注意

Excel 导入/导出依赖 SheetJS CDN：

`https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`

如果在内网环境无法访问 CDN，需把 `xlsx.full.min.js` 下载到仓库并修改 `index.html` 里的脚本引用。
