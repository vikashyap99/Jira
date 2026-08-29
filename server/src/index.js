const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`[server] Jira backend running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
