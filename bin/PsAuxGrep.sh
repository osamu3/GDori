#!/bin/bash

if [ $# -gt 0 ]; then
  echo "何かしらの引数が設定されたので、引数を起動します。"
   ps aux | grep $1
  exit 0
fi

echo "引数が無かったので、app.jsを起動"
ps aux
exit 0
