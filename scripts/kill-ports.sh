#!/bin/bash

# 终止占用指定端口范围的进程
# 用法: ./kill-ports.sh [start_port] [end_port]
# 示例: ./kill-ports.sh 4800 4802

START_PORT=${1:-4800}
END_PORT=${2:-4802}

echo "正在检查端口范围 $START_PORT-$END_PORT..."

killed_count=0

for port in $(seq $START_PORT $END_PORT); do
  # 查找占用该端口的进程 PID
  pid=$(lsof -ti :$port 2>/dev/null)

  if [ -n "$pid" ]; then
    echo "发现端口 $port 被进程 $pid 占用，正在终止..."
    kill $pid 2>/dev/null

    if [ $? -eq 0 ]; then
      echo "✓ 已终止进程 $pid (端口 $port)"
      ((killed_count++))
    else
      echo "✗ 无法终止进程 $pid (端口 $port)，尝试强制终止..."
      kill -9 $pid 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "✓ 已强制终止进程 $pid (端口 $port)"
        ((killed_count++))
      else
        echo "✗ 强制终止失败 (端口 $port)"
      fi
    fi
  fi
done

if [ $killed_count -eq 0 ]; then
  echo "没有发现占用端口 $START_PORT-$END_PORT 的进程"
else
  echo "已终止 $killed_count 个进程"
fi
