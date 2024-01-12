import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGOODB_URI}/
          ${DB_NAME}
          `
    );
    console.log(`DB connected!! ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("Failed to connect to data base Error: ", error);
    process.exit(1);
  }
};

export default connectDB;
