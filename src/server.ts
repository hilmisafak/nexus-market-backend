import "dotenv/config";
import app from "./app.js";
import connectMongo from "./config/mongo.js";
import { prisma } from "./config/prisma.js";
import { env } from "./lib/env.js";

const startServer = async () => {
  try {
    await connectMongo();
    await prisma.$connect();
    console.log("PostgreSQL baglantisi basarili");

    app.listen(env.PORT, () => {
      console.log(`Sunucu ${env.PORT} portunda calisiyor`);
    });
  } catch (error) {
    console.error("Sunucu baslatilamadi:", error);
    process.exit(1);
  }
};

void startServer();
