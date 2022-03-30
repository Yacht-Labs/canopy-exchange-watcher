import { createAlchemyWeb3 } from "@alch/alchemy-web3";
import { AbiItem } from "web3-utils";
import canopyVault from "./abi/CanopyVault.json";
import web3Polygon from "./providers/web3Polygon";
import mongoose from "mongoose";
import "dotenv/config";
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";

const { VAULT_CONTRACT_ADDRESS, CHUNK_SIZE, DATABASE_URL } = process.env;

const vaultContract = new web3Polygon.eth.Contract(
  canopyVault.abi as AbiItem[],
  VAULT_CONTRACT_ADDRESS
);

mongoose.connect(DATABASE_URL);

async function getChainStatus() {
  try {
    let res = await ChainStatus.find();
    return res[0];
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
    if (!lockStatus) {
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
      function (error, events) {
        if (error) console.log(error);
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
  setInterval(watcherLoop, 4000);
};
watcher();

// TODO: Look into why the following error occurs
/* 
(node:1241) UnhandledPromiseRejectionWarning: ParallelSaveError: Can't save() the same doc multiple times in parallel. Document: 6243243e7383adb419896fef
    at model.Model.save (/Users/henryminden/canopy-exchange-watcher/node_modules/mongoose/lib/model.js:491:20)
    at Timeout.watcherLoop [as _onTimeout] (/Users/henryminden/canopy-exchange-watcher/dist/src/watcher.js:89:22)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
(Use `node --trace-warnings ...` to show where the warning was created)
*/
