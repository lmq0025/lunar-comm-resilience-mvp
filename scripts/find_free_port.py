"""Print the first loopback TCP port that can be bound."""

from __future__ import annotations

import argparse
import socket


def find_free_port(start_port: int) -> int:
    for port in range(start_port, 65536):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"no free TCP port found from {start_port}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("start_port", type=int, nargs="?", default=8765)
    args = parser.parse_args()
    if not 1 <= args.start_port <= 65535:
        parser.error("start_port must be between 1 and 65535")
    print(find_free_port(args.start_port))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
