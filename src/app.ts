import express from 'express';
import { checkAndNotify } from './utils/notifications';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Slackの検証エンドポイント
app.post('/slack/events', async (req, res) => {
  try {
    console.log('Slack event received:', req.body);

    if (req.body && req.body.type === 'url_verification') {
      const challenge = req.body.challenge;
      console.log('Challenge received:', challenge);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ challenge });
    }

    // イベントの処理
    if (req.body.event) {
      await checkAndNotify((message) => {
        console.log('Sending notification:', message);
        // Slackへの通知処理
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Slack event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;