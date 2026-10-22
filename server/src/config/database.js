const mongoose = require("./mongoose");

// 서버리스(Vercel)에서는 함수 인스턴스가 재사용되므로 연결 Promise를 캐시해 요청마다 새로 연결하지 않는다.
let connectionPromise = null;

async function connect() {
  const atlasUrl = process.env.MONGODB_ATLAS_URL?.trim();
  const localUri = process.env.MONGODB_URI?.trim();
  const mongoUri = atlasUrl || localUri;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_ATLAS_URL or MONGODB_URI is not set. Copy .env.example to .env and configure it."
    );
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB (${atlasUrl ? "Atlas" : "local"})`);
}

function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }
  if (!connectionPromise) {
    connectionPromise = connect().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}

module.exports = connectDatabase;
