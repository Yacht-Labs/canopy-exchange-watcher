import { web3Origin } from "./providers";
import { vaultContract } from "./contracts";
import mongoose from "mongoose";
import "dotenv/config";
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model/model";

const { CHUNK_SIZE, DATABASE_URL } = process.env;

async function getChainStatus() {
  try {
    const status = await ChainStatus.find();
    return status[0];
  } catch (err) {
    console.error("Error fetching DB Chain Status", err);
    return;
  }
}

const watcher = async () => {
  let isWatcherLocked = false;
  mongoose.connect(DATABASE_URL);

  async function shouldCheckForEvents(watcherBlockHeight: number) {
    if (watcherBlockHeight && !isWatcherLocked) {
      try {
        await web3Origin.eth.getBlockNumber();
        const blockNumber = await web3Origin.eth.getBlockNumber();
        if (blockNumber - watcherBlockHeight > parseInt(CHUNK_SIZE) - 1) {
          isWatcherLocked = true;
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

  async function watcherLoop() {
    let cs = await getChainStatus();

    let shouldCheck = await shouldCheckForEvents(cs.watcherBlockHeight);

    if (!shouldCheck) {
      console.log("locked");
      return;
    }
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
    }

    console.log("Events: ", events);
    isWatcherLocked = false;
  }
  setInterval(watcherLoop, 4000);
};
watcher();
