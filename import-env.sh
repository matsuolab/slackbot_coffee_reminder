#!/bin/bash
for kv in $(< $1)
do
  if [[ "$kv" = ^\s*$ ]] || [[ "$kv" =~ ^# ]]; then
    continue
  fi
  export $kv
done