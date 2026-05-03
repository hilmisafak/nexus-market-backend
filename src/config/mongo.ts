import mongoose from "mongoose";
import { env } from "../lib/env.js";

const connectMongo = async () => {
  const isTest = env.NODE_ENV === "test";
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      // In test environments we want fast feedback when Atlas/local Mongo is unreachable.
      serverSelectionTimeoutMS: isTest ? 5000 : 30000,
      connectTimeoutMS: isTest ? 5000 : 30000,
    });
    console.log(`MongoDB baglantisi basarili: ${conn.connection.host}`);
  } catch (err) {
    if (err instanceof Error && err.name === "MongooseServerSelectionError") {
      console.error(
        "MongoDB sunucu secimi basarisiz. Atlas kullaniyorsaniz: Network Access > IP Access List " +
          "icinde guncel IP’nizi (veya gelistirme icin gecici olarak 0.0.0.0/0) ekleyin; " +
          "MONGO_URI kullanici adi/sifre ve cluster adresini kontrol edin. Yerel gelistirme icin " +
          "docker-compose ile Mongo da kullanilabilir (.env.example).",
      );
    }
    throw err;
  }
};

export default connectMongo;
