import mongoose from 'mongoose';
import 'dotenv/config'
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";
checkSchema()
async function checkSchema() {
  const { DATABASE_URL } = process.env
  console.log(DATABASE_URL)
  await mongoose.connect(DATABASE_URL);
  console.log("connected")


  let res = await ChainStatus.find()
  console.log(res[0])
  if (res[0]) {
    console.log("found")
  } else {
    const chainStatus = new ChainStatus({
        watcherBlockHeight: 25267204,
        mintedBlockHeight: 25267204,
        minterBlockHeight: 25267204,
    })
    await chainStatus.save(function (err) {
        if (err) return;
        // saved!
    });
    console.log("saved")
  }




}