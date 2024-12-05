#!/usr/bin/bash

source import-env.sh .env

# 既存のプロセスを終了
pkill -f "npm run dev"
pkill -f "ngrok"
lsof -i :3000 | grep Seong | awk '{print $2}' | xargs kill -9

# logsディレクトリがない場合は作成
mkdir -p logs

# ngrokをホスト側で起動
./ngrok config add-authtoken $NGROK_TOKEN
nohup ./ngrok http 3000 >./logs/ngrok.log 2>&1 &

# ngrokが起動するまで少し待つ
sleep 5

# ngrok URLを取得 (jqを使わずに)
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o '[^"]*$')
echo "ngrok URL: $NGROK_URL" #> ./logs/ngrok_URL.log
#ngrok.logの Forwarding https://xxxxx.ngrok-free.app をslack APIにコピー
# 1. Event SubscriptionsのRequest URL
# 2. Interactivity & ShortcutsのRequest URL
# 3. Slash CommandsのRequest URL

nohup npm run dev >./logs/npm_dev.log 2>&1 &

# 実行中のプロセス確認
#ps aux | grep ngrok
#ps aux | grep "npm run dev"
