import 'dotenv/config';
import { App } from '@slack/bolt';
import express from 'express';
import { generateHourOptions, generateMinuteOptions } from './utils/timeUtils';
import { getCurrentState, updateState, logAction } from './db/schema';
import { checkAndNotify } from './utils/notifications';
import dotenv from 'dotenv';
dotenv.config();

// Express appを作成
const expressApp = express();
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// デバッグ用のログミドルウェア
expressApp.use((req, res, next) => {
  console.log('Request Body:', req.body);
  next();
});

// Slackの検証エンドポイント
expressApp.post('/slack/events', (req, res) => {
  console.log('Received request:', req.body);
  
  if (req.body && req.body.type === 'url_verification') {
    const challenge = req.body.challenge;
    console.log('Sending challenge response:', challenge);
    return res.status(200).json({
      challenge: challenge
    });
  }
  
  return res.sendStatus(200);
});

// サーバーの起動
const server = expressApp.listen(process.env.PORT || 3000, () => {
  console.log('⚡️ Express server is running');
});

// Boltアプリの設定は一時的にコメントアウト
/*
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // ... 他の設定
});
*/ 