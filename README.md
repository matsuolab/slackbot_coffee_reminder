# コーヒーマシン管理Slackボット

## 概要
研究室のコーヒーマシンの使用状況を管理し、片付け時間を通知するSlackボットです。

## 機能

- マシンの使用状態の管理
- 片付け時間の30分前に通知
- 片付け忘れ防止のリマインド（片付け忘れていた場合、片付け時間から30分後にチャンネルへ@hereメンション）
- 使用履歴のログ記録

## 使用可能なコマンド

- `/barista on` - マシンを開けるときに使用。片付け時間を選択できます
- `/barista off` - マシンを閉めるときに使用。開けた人と違ってもOK
- `/barista status` - マシンの現在の状態、開けた人、閉めた人を確認
- `/barista help` - 使用可能なコマンド一覧を表示

## セットアップ方法

1. リポジトリのクローン

```
git clone https://github.com/matsuolab/slackbot_coffee_reminder.git
```

2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定：

```
SLACK_BOT_TOKEN=xoxb-****
SLACK_SIGNING_SECRET=****
SUPABASE_URL=****
SUPABASE_ANON_KEY=****
SLACK_CHANNEL_ID=C07M21H2T51  # #club_coffee_at_studioのチャンネルID
NODE_ENV=production
PORT=3000
NGROK_TOKEN=****  # ngrokのウェブサイトで取得
```

3. アプリケーションの起動
（nohupで共有サーバーで動かし続けている）
```
bash run.sh
```

4. Slack APIの設定

表示されたngrok URL（`https://xxxxx.ngrok-free.app`）末尾に`/slack/events`を追加して`https://xxxxx.ngrok-free.app/slack/events`とし、以下の3箇所に設定：
- Event SubscriptionsのRequest URL
- Interactivity & ShortcutsのRequest URL
- Slash CommandsのRequest URL

注意: run.shするたび(例えば共有サーバがとまるとか)にURLが変わるので貼り直しが必要。

## 動作環境
- Node.js >= 18.0.0
- npm >= 8.0.0

### 隠しコマンド
ここまでよんだあなたにおしえようひみつのじゅもんを．．．
- `/barista secret` - その他の隠しコマンド一覧を表示