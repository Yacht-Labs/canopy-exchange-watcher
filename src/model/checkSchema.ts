import mongoose from "mongoose";
import "dotenv/config";
import { ChainStatus } from "./model";
checkSchema();
async function checkSchema() {
  const { DATABASE_URL, ORIGIN_CHAIN_BLOCK_HEIGHT } = process.env;
  const blockHeight = parseInt(ORIGIN_CHAIN_BLOCK_HEIGHT);

  console.log("Connecting to database at: ", DATABASE_URL);
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to database");

  let [status] = await ChainStatus.find();
  if (status) {
    console.log("Current ChainStatus: ", status);
  } else {
    const chainStatus = new ChainStatus({
      watcherBlockHeight: blockHeight,
    });
    try {
      await chainStatus.save();
      console.log("saved");
    } catch (err) {
      console.error("Error creating new ChainStatus document: ", err);
    }
  }
}
