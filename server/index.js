const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./app");
const connectDatabase = require("./src/config/database");
const { logSandboxStatus } = require("./src/config/portoneSandbox");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`API server listening on http://localhost:${port}`);
      logSandboxStatus();
    });
  } catch (error) {
    console.error("Failed to start the API server:", error.message);
    process.exitCode = 1;
  }
}

// Vercel에서는 app을 함수로 내보내기만 하고, 로컬에서만 직접 listen한다.
if (process.env.VERCEL) {
  logSandboxStatus();
} else {
  startServer();
}

module.exports = app;
