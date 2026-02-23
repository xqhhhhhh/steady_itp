# Local Alarm Backend (User Guide)

This package is for local alarm sound notifications.

- Local API URL: `http://127.0.0.1:8002`
- Main config file (only file user edits): `alarm_service.yaml`

## 1. Files To Send

Send the full folder after running `build_release.sh`, or at least:

- `alarm_service.py`
- `requirements-alarm.txt`
- `alarm_service.yaml.template` (rename to `alarm_service.yaml`)
- `start_windows.bat`
- `start_macos.command`
- `start_linux.sh`
- `README.md`

## 2. What User Edits (Only One File)

Edit `alarm_service.yaml` only:

- `alarm.enabled`
- `alarm.repeat_interval_sec`
- `alarm.max_duration_sec`

## 3. Windows Quick Start

1. Install Python 3.10+ (`py -V`)
2. Rename `alarm_service.yaml.template` to `alarm_service.yaml`
3. Double click `start_windows.bat`

## 4. macOS Quick Start

1. Install Python 3.10+ (`python3 --version`)
2. Rename `alarm_service.yaml.template` to `alarm_service.yaml`
3. Run:

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
curl -X POST http://127.0.0.1:8002/notify/alarm \
  -H "Content-Type: application/json" \
  -d '{"title":"测试提醒","text":"进入价格页"}'
curl -X POST http://127.0.0.1:8002/alarm/stop
```

If service is not running, extension will skip local alarm automatically.
