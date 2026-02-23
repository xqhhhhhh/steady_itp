# Aliyun Call Local Backend (User Guide)

This package is for local Aliyun phone notifications.

- Local API URL: `http://127.0.0.1:8002`
- Main config file (only file user edits): `call_service.yaml`

## 1. Files To Send

Send the full folder after running `build_release.sh`, or at least:

- `call_service.py`
- `requirements-call.txt`
- `call_service.yaml.template` (rename to `call_service.yaml`)
- `start_windows.bat`
- `start_macos.command`
- `start_linux.sh`
- `README.md`

## 2. What User Edits (Only One File)

Edit `call_service.yaml` only:

- `aliyun_call.enabled` -> `true`
- `aliyun_call.access_key_id`
- `aliyun_call.access_key_secret`
- `aliyun_call.called_show_number`
- `aliyun_call.tts_code`
- `aliyun_call.called_number` (optional)
- `aliyun_call.tts_param` (match your TTS template vars)

## 3. Windows Quick Start

1. Install Python 3.10+ (`py -V`)
2. Rename `call_service.yaml.template` to `call_service.yaml`
3. Edit `call_service.yaml`
4. Double click `start_windows.bat`

## 4. macOS Quick Start

1. Install Python 3.10+ (`python3 --version`)
2. Rename `call_service.yaml.template` to `call_service.yaml`
3. Edit `call_service.yaml`
4. Run:

```bash
chmod +x ./start_macos.command ./start_linux.sh
./start_macos.command
```

## 5. Linux Quick Start

```bash
chmod +x ./start_linux.sh
./start_linux.sh
```

## 6. Self Check

```bash
curl http://127.0.0.1:8002/health
curl -X POST http://127.0.0.1:8002/notify/aliyun-call \
  -H "Content-Type: application/json" \
  -d '{"title":"测试提醒","text":"进入价格页","called_number":"13800138000"}'
```

If service is not running or not configured, extension will skip phone call automatically.
