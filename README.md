# NOL 抢票自动化（Chrome 插件 + FastAPI 后端）

当前后端已拆分为两个独立服务：

- `ocr_service.py`：验证码识别（建议部署到云服务器）
- `vpn_service.py`：VPN 健康探测与切换（建议保留本地）

## 目录结构

- `/Users/xuqihan/Desktop/code_study/抢票/extension`：Chrome 扩展代码
- `/Users/xuqihan/Desktop/code_study/抢票/ocr_service.py`：OCR 服务
- `/Users/xuqihan/Desktop/code_study/抢票/vpn_service.py`：VPN 服务
- `/Users/xuqihan/Desktop/code_study/抢票/captcha_api.py`：旧版合并服务（兼容）
- `/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml`：VPN 切换配置
- `/Users/xuqihan/Desktop/code_study/抢票/scripts/flclash_switch.sh`：FlClash 切节点脚本

## 环境要求

- Python 3.11+
- `uv`
- Chrome（开发者模式加载扩展）
- FlClash（本地 VPN 切换依赖）

## 安装依赖

```bash
cd /Users/xuqihan/Desktop/code_study/抢票
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

## 启动方式（拆分模式）

### 1) 本地启动 VPN 服务

```bash
uv run python vpn_service.py
```

默认监听：`http://127.0.0.1:8000`

### 2) 启动 OCR 服务（本地调试或云端部署）

```bash
uv run python ocr_service.py
```

默认监听：`http://127.0.0.1:8001`

部署到云端时，建议使用反向代理或直接以 `uvicorn ocr_service:app --host 0.0.0.0 --port 8001` 启动。

## 扩展配置（关键）

插件中分开配置两个地址：

- `OCR 服务地址（可填云服务器）`：例如 `https://your-ocr-domain.example.com/ocr/file`
- `OCR 激活码（首激活必填）`：首次输入后绑定当前设备
- `VPN 切换 API 地址`：保持本地，例如 `http://127.0.0.1:8000`

默认值已调整为：

- OCR：`http://127.0.0.1:8001/ocr/file`
- VPN：`http://127.0.0.1:8000`

## VPN 切换配置

默认读取：

- `/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml`

可用环境变量覆盖：

```bash
export VPN_SWITCH_CONFIG="/absolute/path/to/vpn_switch.yaml"
```

`/vpn/switch` 策略：

- `round_robin`：按节点列表轮换
- `fastest`：测列表节点延迟后切到最快

## API 列表

### OCR 服务

- `GET /health`
- `POST /license/activate`（激活码 + 设备ID，返回短期 access token）
- `POST /license/admin/create`（管理员导入激活码）
- `POST /license/admin/generate`（管理员批量生成激活码）
- `POST /license/admin/revoke`（管理员吊销激活码）
- `POST /ocr/file`
- `POST /ocr/base64`

说明：

- `POST /ocr/*` 需要鉴权请求头：`Authorization: Bearer <access_token>`
- `access_token` 由 `/license/activate` 下发，带有效期
- 激活码一旦绑定设备，其他设备使用同一激活码会被拒绝
- 管理员接口需要配置 `OCR_ADMIN_TOKEN`
- 可选兼容：若配置了 `OCR_API_TOKEN`，仍可作为静态 token 直连

### VPN 服务

- `GET /health`
- `POST /vpn/health`
- `POST /vpn/switch`

示例：手动切换最快节点

```bash
curl -sS -X POST http://127.0.0.1:8000/vpn/switch \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual_fastest","current_queue":10,"strategy":"fastest"}'
```

## 兼容模式

如需一次性启动旧版合并服务，仍可使用：

```bash
uv run python captcha_api.py
```
