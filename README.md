# NOL 抢票自动化（Chrome 插件 + FastAPI 后端）

本项目用于 NOL / Interpark 抢票流程自动化，包含两部分：

- Chrome 扩展：页面识别、抢票步骤执行、日志、钉钉通知。
- Python 后端：验证码 OCR、VPN 健康探测与节点切换。

## 目录结构

- `/Users/xuqihan/Desktop/code_study/抢票/extension`：Chrome 扩展代码
- `/Users/xuqihan/Desktop/code_study/抢票/captcha_api.py`：FastAPI 后端
- `/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml`：VPN 切换配置
- `/Users/xuqihan/Desktop/code_study/抢票/scripts/flclash_switch.sh`：FlClash 切节点脚本
- `/Users/xuqihan/Desktop/code_study/抢票/scripts/flclash_list_proxies.sh`：查看代理组与当前节点

## 环境要求

- Python 3.11+
- `uv`
- Chrome（开发者模式加载扩展）
- FlClash（已开启 External Controller，默认 `127.0.0.1:9090`）

## 后端启动（uv）

```bash
cd /Users/xuqihan/Desktop/code_study/抢票
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run python captcha_api.py
```

健康检查：

```bash
curl -sS http://127.0.0.1:8000/health
```

## 扩展安装与使用

1. 打开 `chrome://extensions/`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择目录：`/Users/xuqihan/Desktop/code_study/抢票/extension`
5. 在插件弹窗填写配置后点击“开始”

## 核心自动化流程（当前）

1. 活动页：点击“立即购买”（支持开抢时间前预进场与临界加速）
2. 可选预约页：如出现“预约/預約”，自动点击进入下一步
3. 日期/场次页：优先早日期、早场次，失败自动回退重试
4. 排队页：等待放行，带随机保活动作；支持队列健康探测
5. 验证码页：截图发后端 OCR，回填并提交（6 位字母候选）
6. 选座页：优先可选座，按策略选中后“完成选择”
7. 价格页：先点加号到目标票数，再点“預購/訂購”
8. 信息页：国家码、手机号、同意条款、信息提交

说明：

- 已移除“总计后支付（如微信支付）”自动化。
- 若 `执行全部流程` 关闭，则到价格页后停止。

## VPN 切换配置

默认读取：

- `/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml`

可用环境变量覆盖配置文件路径：

```bash
export VPN_SWITCH_CONFIG="/absolute/path/to/vpn_switch.yaml"
```

`/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml` 示例：

```yaml
flclash:
  selector: "🔰 选择节点"
  switch_script: "/Users/xuqihan/Desktop/code_study/抢票/scripts/flclash_switch.sh"
  controller: "http://127.0.0.1:9090"
  secret: ""
  delay_url: "https://tickets.interpark.com/"
  delay_timeout_ms: 3500
  nodes:
    - "🇭🇰 香港Y01"
    - "🇯🇵 日本Y01 | IEPL"
    - "🇭🇰 香港Y02 | IEPL"
    - "🇯🇵 日本Y02 | IEPL"
```

`/vpn/switch` 策略：

- `round_robin`：按节点列表轮换
- `fastest`：测列表节点延迟后切到最快

当前触发点：

- 插件启动时：自动切到最快节点
- 排队剩余人数 `<= 50`：再次切到最快节点
- 队列重度异常：按策略自动切换（支持冷却与关键区间保护）

## 后端 API

- `POST /ocr/file`：图片文件 OCR
- `POST /ocr/base64`：base64 OCR
- `POST /vpn/health`：网络健康探测
- `POST /vpn/switch`：VPN 切换（支持 `strategy`）

示例：手动切最快节点

```bash
curl -sS -X POST http://127.0.0.1:8000/vpn/switch \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual_fastest","current_queue":10,"strategy":"fastest"}'
```

## 钉钉通知（可选）

插件支持配置：

- `dingTalkWebhookUrl`
- `dingTalkSecret`（加签可选）

已支持的关键通知：

- 开抢前 3 分钟提醒
- 排队剩余阈值（1000/100/10）
- 进入价格页
- 队列网络重度异常 / 恢复

## 常见排查

1. `verify_ok: false` 但 `ok: true`
- 表示切换命令执行成功，只是验证 URL 超时。

2. 检查当前节点是否切换成功

```bash
/Users/xuqihan/Desktop/code_study/抢票/scripts/flclash_list_proxies.sh
```

关注输出中 `Group: 🔰 选择节点` 的 `Now`。

3. FlClash Controller 不通

```bash
lsof -nP -iTCP:9090 -sTCP:LISTEN
curl -sS http://127.0.0.1:9090/version
```

若失败，先确认 FlClash 已开启 External Controller。
