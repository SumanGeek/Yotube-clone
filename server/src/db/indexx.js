import mongoose from "mongoose";
import { DB_NAME } from "../constant";

const connectDB = async () => {
  try {
    const connectInstance = await mongoose.connect(
      `${process.env.MONGOODB_URI}/
          ${DB_NAME}`
    );

    console.log(`Database connected at ${connectInstance.connection.host}`);
  } catch (error) {
    console.log("Error while connecting with database", error);
  }
};

export default connectDB;
