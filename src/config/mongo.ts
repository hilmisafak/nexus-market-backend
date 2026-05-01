import mongoose from "mongoose";
import { env } from "../lib/env.js";

const connectMongo = async () => {
  const isTest = env.NODE_ENV === "test";
  const conn = await mongoose.connect(env.MONGO_URI, {
    // In test environments we want fast feedback when Atlas/local Mongo is unreachable.
    serverSelectionTimeoutMS: isTest ? 5000 : 30000,
    connectTimeoutMS: isTest ? 5000 : 30000,
  });
  console.log(`MongoDB baglantisi basarili: ${conn.connection.host}`);
};

export default connectMongo;
