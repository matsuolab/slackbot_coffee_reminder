declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SLACK_BOT_TOKEN: string;
      SLACK_SIGNING_SECRET: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      SLACK_CHANNEL_ID: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}

export {} 