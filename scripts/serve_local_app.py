"""Run Uvicorn, wait for health, then open the local production UI."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys
from threading import Thread
import webbrowser

from wait_for_health import wait_for_health


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--health-timeout", type=float, default=30.0)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    app_data = Path(os.environ["LUNAR_APP_DATA_DIR"]).resolve()
    log_path = app_data / "logs" / "local_app_launcher.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    url = f"http://127.0.0.1:{args.port}"
    health_url = f"{url}/api/v1/health"
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "lunar_comm_sim.api.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(args.port),
    ]

    with log_path.open("a", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            command,
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )

        def relay_output() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                print(line, end="", flush=True)
                log_file.write(line)
                log_file.flush()

        Thread(target=relay_output, daemon=True).start()
        try:
            wait_for_health(health_url, timeout_s=args.health_timeout)
        except TimeoutError:
            stop_process(process)
            print("后端启动失败")
            print(f"日志路径: {log_path}")
            print("最后 30 行错误:")
            for line in tail_lines(log_path, 30):
                print(line)
            return 1

        print(f"本地应用: {url}")
        print(f"数据目录: {app_data}")
        if os.environ.get("LUNAR_OPEN_BROWSER", "1") != "0":
            print("后端健康检查已通过，正在打开浏览器。")
            webbrowser.open(url)
        else:
            print("后端健康检查已通过；本次已禁用自动打开浏览器。")

        try:
            return process.wait()
        except KeyboardInterrupt:
            stop_process(process)
            return 0


def stop_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def tail_lines(path: Path, count: int) -> list[str]:
    if not path.exists():
        return ["(日志文件不存在)"]
    return path.read_text(encoding="utf-8", errors="replace").splitlines()[-count:]


if __name__ == "__main__":
    raise SystemExit(main())
