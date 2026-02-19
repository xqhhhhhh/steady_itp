# VPN Local Backend (User Guide)

This package is for the local VPN switch backend used by the plugin.

- Local API URL: `http://127.0.0.1:8000`
- Default bind: `127.0.0.1` only
- Main config file (only file user edits): `vpn_switch.yaml`

## 1. Files You Need To Send To Users

Send the full folder after running `build_release.sh`, or send these files manually:

- `vpn_service.py`
- `requirements-vpn.txt`
- `vpn_switch.yaml.template` (rename to `vpn_switch.yaml`)
- `scripts/flclash_switch.sh`
- `start_windows.bat`
- `start_macos.command`
- `start_linux.sh`
- `autostart/windows/install_task.ps1`
- `autostart/windows/uninstall_task.ps1`
- `autostart/macos/com.nolbot.vpn-switch.plist`
- `autostart/linux/nolbot-vpn-switch.service`
- `README.md`

## 2. What User Needs To Edit (Only One File)

Edit `vpn_switch.yaml` only:

- `flclash.selector`: proxy group name
- `flclash.nodes`: node list to rotate
- `flclash.switch_script`: local path to `scripts/flclash_switch.py`
- `flclash.controller` / `flclash.secret`: local Clash controller info

Do not edit Python code.

## 3. Windows Quick Start

1. Install Python 3.10+ (check: `py -V`)
2. Rename `vpn_switch.yaml.template` to `vpn_switch.yaml`
3. Edit `vpn_switch.yaml`
4. Double click `start_windows.bat`

If started successfully, backend listens on:

- `http://127.0.0.1:8000`

## 4. macOS Quick Start

1. Install Python 3.10+ (check: `python3 --version`)
2. Rename `vpn_switch.yaml.template` to `vpn_switch.yaml`
3. Edit `vpn_switch.yaml`
4. In Terminal:

```bash
chmod +x ./start_macos.command ./start_linux.sh ./scripts/flclash_switch.sh
./start_macos.command
```

## 5. Plugin Settings

In plugin UI:

- VPN API URL: `http://127.0.0.1:8000`
- Enable: `Auto switch VPN when queue is unhealthy`

## 6. Self Check Commands

```bash
curl http://127.0.0.1:8000/vpn/health
curl -X POST http://127.0.0.1:8000/vpn/switch
```

## 7. Auto Start

### 7.1 Windows (Task Scheduler)

Run PowerShell as current user in package root:

```powershell
powershell -ExecutionPolicy Bypass -File .\autostart\windows\install_task.ps1 -AppDir "$PWD"
```

Remove:

```powershell
powershell -ExecutionPolicy Bypass -File .\autostart\windows\uninstall_task.ps1
```

### 7.2 Windows (NSSM, optional)

You can also use NSSM to create a service:

- App: `cmd.exe`
- Arguments: `/c "<package_path>\start_windows.bat"`
- Startup type: Automatic

### 7.3 macOS (LaunchAgent)

1. Copy `autostart/macos/com.nolbot.vpn-switch.plist` to:

- `~/Library/LaunchAgents/com.nolbot.vpn-switch.plist`

2. Replace all placeholders:

- `__APP_DIR__`

3. Load:

```bash
launchctl unload ~/Library/LaunchAgents/com.nolbot.vpn-switch.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.nolbot.vpn-switch.plist
launchctl start com.nolbot.vpn-switch
```

### 7.4 Linux (systemd)

1. Copy `autostart/linux/nolbot-vpn-switch.service` to:

- `/etc/systemd/system/nolbot-vpn-switch.service`

2. Replace placeholders:

- `__APP_DIR__`
- `__USER__`

3. Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nolbot-vpn-switch.service
sudo systemctl status nolbot-vpn-switch.service
```

## 8. Security Defaults

- Bind host defaults to `127.0.0.1`
- Localhost-only guard enabled by default (`VPN_LOCAL_ONLY=1`)
- Command/log outputs are masked in response fields

## 9. Troubleshooting

- `403 Localhost only`: request is not from local machine.
- `VPN switch command failed`: check `flclash.switch_script`, `flclash.selector`, `flclash.nodes`.
- `未配置`: check `vpn_switch.yaml` path and syntax.
