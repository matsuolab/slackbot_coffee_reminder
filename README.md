# ☕ コーヒーマシン管理Slackボット取扱説明書

## 🎯 このボットでできること

- ✨ マシンの使用状態をリアルタイムで確認
- ⏰ 片付け時間の30分前に自動通知
- 🔔 片付け忘れ防止リマインド
- 📝 使用履歴の自動記録
- 🧹 掃除当番管理と通知

## コマンド一覧

```bash
/barista on        # マシンを開ける + 当日の掃除当番メンション
/barista off       # 掃除完了報告
/barista status    # 現在の状態確認
/barista schedule  # 掃除スケジュール確認
/barista change @user date  # 担当日交換
/barista help      # ヘルプ表示
```

## 📱 基本的な使い方

1️⃣ マシンを使い始めるとき: 片付け時間を選択できるポップアップが表示されます

```bash
/barista on
```

- 当日の掃除当番者が自動でメンションされます

2️⃣ マシンを片付けるとき: 開けた人と異なる人でも大丈夫です！

```bash
/barista off
```

- 掃除完了が自動的に記録されます

3️⃣ 現在の状態を確認

```bash
/barista status
```

以下の情報が確認できます：

- マシンが使用中かどうか
- 誰が開けたか
- いつ片付ける予定か
- 当日の掃除当番

4️⃣ 掃除スケジュールを確認

```bash
/barista schedule
```

- 週単位で掃除当番が表示されます
- 完了状態も確認できます（✅/⬜）

5️⃣ 掃除当番を変更

```bash
/barista change @user 2024-06-10
```

- 特定の日の掃除担当者を変更できます
- 日付はYYYY-MM-DD形式で指定

6️⃣ 使い方を確認

```bash
/barista help
```

## ⚠️ 重要な通知について

1. 30分前通知 🕒

- 片付け時間の30分前に自動でお知らせします
- マシンを開けた人にメンションが飛びます

2. 片付け忘れ通知 ⚡

- 片付け時間から30分経過しても片付いていない場合
- チャンネル全体（@here）にリマインドが送られます

3. 週間予定通知 📆

- 毎週金曜日の15時に次週の掃除当番表が自動通知されます

### 💡 Tips

- マシンは誰が開けても、誰が片付けてもOKです
- 困ったときは /barista help で使い方を確認できます

# ここからはエンジニア向け

## セットアップ方法

### 1. リポジトリのクローン

```bash
git clone https://github.com/matsuolab/slackbot_coffee_reminder.git
```

### 2. supabaseでDB作成

以下のSQLをSQL Editorにコピペ&RunでDBができる

- supabase/make_table.txt（コーヒーマシン状態テーブル）
- supabase/enable_rsl.txt（Row Security Level設定）
- supabase/cleaning_schedule_table.txt（掃除スケジュールテーブル）

supabase URLとkeyをメモ

### 3. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定：

```bash
SLACK_BOT_TOKEN=xoxb-****
SLACK_SIGNING_SECRET=****
SUPABASE_URL=****
SUPABASE_ANON_KEY=****
SLACK_CHANNEL_ID=C07M21H2T51  # #club_coffee_at_studioのチャンネルID
NODE_ENV=production
PORT=3000
NGROK_TOKEN=****  # ngrokのウェブサイトで取得
```

### 4. パッケージのインストールなど
- ngrok: https://download.ngrok.com/linux?tab=download
- node.js: https://nodejs.org/en/download/package-manager

```bash
npm install
```

### 5. アプリケーションの起動

（nohupで共有サーバーp-shared-1で動かし続けている）

```bash
bash run.sh
```
```bash
cat ./logs/npm_dev.log
```
#以下のような表示がでたらOK
```
> slackbot_coffee_reminder@1.0.0 dev
> ts-node src/app.ts(node:41546) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. #Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
⚡️ Bolt app is running on port 3000!
```

### 6. Slack APIの設定

表示されたngrok URL（`https://xxxxx.ngrok-free.app`）末尾に`/slack/events`を追加して`https://xxxxx.ngrok-free.app/slack/events`とし、以下の3箇所に設定：

- Event SubscriptionsのRequest URL
- Interactivity & ShortcutsのRequest URL
- Slash CommandsのRequest URL

注意: run.shするたび(例えば共有サーバがとまるとか)にURLが変わるので貼り直しが必要。

## 動作環境

- Node.js >= 18.0.0
- npm >= 8.0.0

## 技術スタック

- TypeScript
- Slack Bolt Framework
- Supabase
- Node.js (v18以上)
- Express
- date-fns (日付操作)

## 隠しコマンド

ここまでよんだあなたにおしえようひみつのじゅもんを．．．

- `/barista secret` - その他の隠しコマンド一覧を表示
