#!/usr/bin/env python3
"""
Simple async API performance check.

Usage example:
  python backend/scripts/perf_check.py \
    --base-url http://127.0.0.1:8000 \
    --endpoint /health \
    --requests 500 \
    --concurrency 50 \
    --target-ms 200
"""

from __future__ import annotations

import argparse
import asyncio
from statistics import mean
from time import perf_counter

import httpx


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    idx = int(round((pct / 100) * (len(values) - 1)))
    idx = max(0, min(idx, len(values) - 1))
    return sorted(values)[idx]


async def run_check(
    base_url: str,
    endpoint: str,
    requests_total: int,
    concurrency: int,
    timeout: float,
    token: str | None,
    warmup_seconds: float,
) -> dict:
    latencies: list[float] = []
    server_latencies: list[float] = []
    statuses: list[int] = []
    semaphore = asyncio.Semaphore(concurrency)
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    limits = httpx.Limits(
        max_keepalive_connections=max(20, concurrency * 2),
        max_connections=max(100, concurrency * 4),
    )

    async with httpx.AsyncClient(base_url=base_url, timeout=timeout, headers=headers, limits=limits) as client:
        # Warmup prevents first-request noise from polluting test results.
        if warmup_seconds > 0:
            warmup_end = perf_counter() + warmup_seconds
            while perf_counter() < warmup_end:
                try:
                    await client.get(endpoint)
                except Exception:
                    pass

        async def worker():
            async with semaphore:
                start = perf_counter()
                try:
                    response = await client.get(endpoint)
                    statuses.append(response.status_code)
                    header_ms = response.headers.get("x-response-time-ms")
                    if header_ms:
                        try:
                            server_latencies.append(float(header_ms))
                        except ValueError:
                            pass
                except Exception:
                    statuses.append(0)
                latencies.append((perf_counter() - start) * 1000)

        started = perf_counter()
        await asyncio.gather(*(worker() for _ in range(requests_total)))
        total_seconds = perf_counter() - started

    ok = sum(1 for s in statuses if 200 <= s < 400)
    failed = len(statuses) - ok
    rps = requests_total / total_seconds if total_seconds > 0 else 0.0
    return {
        "requests_total": requests_total,
        "ok": ok,
        "failed": failed,
        "success_rate": (ok / requests_total) * 100 if requests_total else 0,
        "avg_ms": mean(latencies) if latencies else 0.0,
        "p95_ms": percentile(latencies, 95),
        "p99_ms": percentile(latencies, 99),
        "max_ms": max(latencies) if latencies else 0.0,
        "server_avg_ms": mean(server_latencies) if server_latencies else 0.0,
        "server_p95_ms": percentile(server_latencies, 95),
        "server_p99_ms": percentile(server_latencies, 99),
        "server_max_ms": max(server_latencies) if server_latencies else 0.0,
        "server_samples": len(server_latencies),
        "rps": rps,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--endpoint", default="/health")
    parser.add_argument("--requests", type=int, default=500)
    parser.add_argument("--concurrency", type=int, default=50)
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument("--target-ms", type=float, default=200.0)
    parser.add_argument("--metric", choices=["e2e", "server"], default="e2e")
    parser.add_argument("--warmup-seconds", type=float, default=1.5)
    parser.add_argument("--token", default=None)
    args = parser.parse_args()

    result = asyncio.run(
        run_check(
            base_url=args.base_url.rstrip("/"),
            endpoint=args.endpoint,
            requests_total=args.requests,
            concurrency=args.concurrency,
            timeout=args.timeout,
            token=args.token,
            warmup_seconds=args.warmup_seconds,
        )
    )

    print("=== Performance Check Result ===")
    print(f"Total Requests : {result['requests_total']}")
    print(f"Success/Failed : {result['ok']}/{result['failed']}")
    print(f"Success Rate   : {result['success_rate']:.2f}%")
    print(f"Avg Latency    : {result['avg_ms']:.2f} ms")
    print(f"P95 Latency    : {result['p95_ms']:.2f} ms")
    print(f"P99 Latency    : {result['p99_ms']:.2f} ms")
    print(f"Max Latency    : {result['max_ms']:.2f} ms")
    print(f"Throughput     : {result['rps']:.2f} req/s")
    if result["server_samples"] > 0:
        print("--- Server Header Latency (x-response-time-ms) ---")
        print(f"Samples        : {result['server_samples']}")
        print(f"Server Avg     : {result['server_avg_ms']:.2f} ms")
        print(f"Server P95     : {result['server_p95_ms']:.2f} ms")
        print(f"Server P99     : {result['server_p99_ms']:.2f} ms")
        print(f"Server Max     : {result['server_max_ms']:.2f} ms")
    else:
        print("--- Server Header Latency ---")
        print("Not available (x-response-time-ms header missing).")

    if result["success_rate"] < 99.0:
        print("FAIL: success rate below 99%")
        return 2
    metric_label = "P95 Latency"
    metric_value = result["p95_ms"]
    if args.metric == "server":
        metric_label = "Server P95 Latency"
        metric_value = result["server_p95_ms"] if result["server_samples"] > 0 else float("inf")
    if metric_value > args.target_ms:
        print(f"FAIL: {metric_label} above target ({args.target_ms:.2f} ms)")
        return 3
    print(f"PASS: meets configured latency and reliability threshold ({args.metric} metric)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
