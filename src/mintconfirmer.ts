import { mintContract } from "./contracts";
import mongoose from "mongoose";
import "dotenv/config";
import { DepositEvent } from "./model/model";

const { DATABASE_URL } = process.env;

const mintConfirmer = async () => {
  await mongoose.connect(DATABASE_URL);

  let mintConfirmerLock = 0;
  async function lockMinter() {
    if (mintConfirmerLock == 0) {
      mintConfirmerLock = 1;
      return true;
    } else {
      return false;
    }
  }

  async function mintConfirmerLoop() {
    const unlocked = await lockMinter();
    if (!unlocked) {
      console.log("locked");
      return;
    }

    const event = await DepositEvent.findOne({ status: "MINTING" });
    if (!event) {
      console.log("No deposit events found!");
      return;
    }
    console.log("Found deposit event on origin chain: " + event);
    const [mintEvent] = await mintContract.getPastEvents("Mint", {
      topics: [
        "0x4e3883c75cc9c752bb1db2e406a822e4a75067ae77ad9a0a4d179f2709b9e1f6",
        event.txHash,
      ],
    });
    console.log("Found mint event on destination chain: " + mintEvent);
    if (!mintEvent) {
      // If we don't find a mint event we will retry 3 times
      let mintConfirmRetries = event.mintConfirmRetries;
      if (!mintConfirmRetries) {
        // Set to 1 if 0 or doesn't exist on event
        console.log(`Deposit ${event.mintTxHash} has retried once!`);
        event.mintConfirmRetries = 1;
        event.save();
        mintConfirmerLock = 0;
        return;
      }
      if (mintConfirmRetries < 3) {
        // Increment the retries if there are less than 3
        mintConfirmRetries++;
        console.log(
          "Deposit %s has retried %s times!",
          event.mintTxHash,
          mintConfirmRetries
        );
        event.mintConfirmRetries = mintConfirmRetries;
        event.save();
        mintConfirmerLock = 0;
        return;
      }
      // If we have retried 3 times mark it as failed
      console.log("Deposit %s has failed!", event.mintTxHash);
      event.status = "MINT_FAILED";
      event.save();
      mintConfirmerLock = 0;
    } else {
      console.log("Deposit %s has been minted!", mintEvent.transactionHash);
      event.mintTxHash = mintEvent.transactionHash;
      event.status = "MINTED";
      event.save();
      mintConfirmerLock = 0;
    }
  }
  setInterval(mintConfirmerLoop, 2000);
};
mintConfirmer();
