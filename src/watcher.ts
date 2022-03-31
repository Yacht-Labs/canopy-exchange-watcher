import { web3Polygon } from "./providers";
import { vaultContract } from "./contracts";
import mongoose from "mongoose";
import "dotenv/config";
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model/model";

const { CHUNK_SIZE, DATABASE_URL } = process.env;

mongoose.connect(DATABASE_URL);

async function getChainStatus() {
  try {
    return await ChainStatus.find()[0];
  } catch (err) {
    console.error("Error fetching DB Chain Status", err);
    return;
  }
}

const watcher = async () => {
  let watcherLock = 0;

  async function lockWatcher(watcherBlockHeight: number) {
    if (watcherBlockHeight && watcherLock == 0) {
      try {
        const blockNumber = await web3Polygon.eth.getBlockNumber();
        const diff = blockNumber - watcherBlockHeight;
        if (diff > parseInt(CHUNK_SIZE) - 1) {
          watcherLock = 1;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.error("Error getting blockheight from polygon provider", err);
        return;
      }
    } else {
      return false;
    }
  }
  let cs = await getChainStatus();

  async function watcherLoop() {
    let lockStatus = await lockWatcher(cs.watcherBlockHeight);

    if (lockStatus === false) {
      console.log("locked");
      return;
    }
    // TODO: Handle case where more than 10,000 events are created within 100 blocks
    // TODO: Add more robust error handling
    let events = await vaultContract.getPastEvents(
      "Deposit",
      {
        fromBlock: cs.watcherBlockHeight,
        toBlock: cs.watcherBlockHeight + parseInt(CHUNK_SIZE) - 1,
      },
      function (err) {
        if (err) {
          console.error("Error getting past events on origin chain: ", err);
        }
      }
    );
    let newRecordsCreated = false;

    events.forEach(async (event) => {
      let de = await DepositEvent.findOne({ txHash: event.transactionHash });
      console.log("Deposit Event: ", de);
      if (de) {
        console.log("found");
      } else {
        console.log("not found");
        let bes = new BlockchainEvent({
          address: event.address,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex,
          // TODO: handle event.removed
          // removed: event.removed,
          txHash: event.transactionHash,
          transactionIndex: event.transactionIndex,
          from: event.returnValues.from,
          amount: event.returnValues.amount,
          event: event.event,
          signature: event.signature,
        });
        let de = new DepositEvent({
          txHash: event.transactionHash,
          status: "NEW",
          event: bes,
        });
        try {
          await de.save();
          console.log("saved");
          newRecordsCreated = true;
        } catch (err) {
          console.log("Err Saving Records: ", err);
        }
      }
    });
    if (!newRecordsCreated) {
      cs.watcherBlockHeight = cs.watcherBlockHeight + parseInt(CHUNK_SIZE);
      await cs.save();
      // cs.update({watcherBlockHeight: cs.watcherBlockHeight + parseIntCHUNK_SIZE})
    }

    console.log("Events: ", events);
    watcherLock = 0;
  }
  setInterval(watcherLoop, 500);
};
watcher();
