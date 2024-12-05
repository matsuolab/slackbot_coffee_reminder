#! /bin/bash

rm ngrok.log
rm npm_dev.log

nohup ngrok http 3000 > logs/ngrok.log & 
#ngrok.logの Forwarding https://xxxxx.ngrok-free.app をslack APIにコピー
# 1. Event SubscriptionsのRequest URL
# 2. Interactivity & ShortcutsのRequest URL
# 3. Slash CommandsのRequest URL

nohup npm run dev > logs/npm_dev.log &


# 実行中のプロセス確認
#ps aux | grep ngrok
#ps aux | grep "npm run dev"