import mongoose from 'mongoose';
import 'dotenv/config'
import {BlockchainEvent, ChainStatus, DepositEvent} from "./model";
checkSchema()
async function checkSchema() {
    const { DATABASE_URL } = process.env
    console.log(DATABASE_URL)
    await mongoose.connect(DATABASE_URL);
    console.log("connected")

    const chainStatus = new ChainStatus({
        watcherBlockHeight: 0,
        minterBlockHeight: 0,
        mintedBlockHeight: 0,
    })

    await chainStatus.save(function (err) {
        if (err) return;
        console.log("saved")
        // saved!
    });
    console.log("saved again")

    
      
}