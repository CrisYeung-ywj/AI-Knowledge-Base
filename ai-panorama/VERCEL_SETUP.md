# AI赋能全景图：Vercel + Supabase 配置

## 1. 创建数据表

在 Supabase 项目中打开 **SQL Editor**，执行 [supabase.sql](./supabase.sql) 的全部内容。

这张表只允许公开读取。写入由 Vercel 服务端完成，服务端密钥不会发送到浏览器。

## 2. 部署到 Vercel

1. 在 Vercel 点击 **Add New > Project**，导入 `CrisYeung-ywj/AI-Knowledge-Base`。
2. 将 **Root Directory** 设置为 `ai-panorama`。
3. 在部署前添加以下环境变量，并勾选 Production、Preview、Development：
   - `SUPABASE_URL`：Supabase 的 Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase 的 service_role key
   - `PANORAMA_EDIT_KEY`：自行设定的更新口令
4. 点击 Deploy。

`SUPABASE_SERVICE_ROLE_KEY` 只能填入 Vercel 环境变量，不能填入前端文件或发送给其他人。

## 3. 首次写入

打开 Vercel 部署后的页面，点击 **导入 Excel**，选择含部门 Sheet 的文件，再点 **保存更新**。

页面首次保存时会要求输入 `PANORAMA_EDIT_KEY`。保存成功后，数据会写入 Supabase，所有访问者刷新页面即可看到最新版本。

## 4. GitHub Pages 兼容

Vercel 域名创建后，在 `config.js` 的 `PANORAMA_API.endpoint` 填入：

```js
endpoint: "https://你的-vercel-域名/api/panorama"
```

这样原 GitHub Pages 链接也会读取和保存同一份云端数据。
