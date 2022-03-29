
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import canopyVault from '../abi/CanopyVault.json'
import auroraMint from '../abi/AuroraMint.json'
import mongoose from 'mongoose';
import 'dotenv/config'
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";

var web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');

const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const { abi: canopyAbi } = canopyVault
const vaultContract = new web3Polygon.eth.Contract(canopyVault.abi as AbiItem[], '0x0e8DEF110b1fC3F649ebCd21871E8bfb2f14244D');
const { DATABASE_URL } = process.env
const CHUNK_SIZE = 10000

async function getChainStatus() {
  let res = await ChainStatus.find()
  return res[0]
}

const watcher = async () => {
  let watcherLock = 0;

  async function lockWatcher(watcherBlockHeight) {
    if (watcherBlockHeight && watcherLock == 0) {
      const blockNumber = await web3Polygon.eth.getBlockNumber()
      if (blockNumber >= watcherBlockHeight + CHUNK_SIZE - 1) {
        watcherLock = 1
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }
  await mongoose.connect(DATABASE_URL);
  let cs = await getChainStatus()

  async function watcherLoop() {
    let lockStatus = await lockWatcher(cs.watcherBlockHeight)
    if (lockStatus == false) {
      console.log("locked")
      return
    }
    // TODO: Handle case where more than 10,000 events are created within 100 blocks
    let events = await vaultContract.getPastEvents('Deposit', {
      fromBlock: cs.watcherBlockHeight,
      toBlock: cs.watcherBlockHeight + CHUNK_SIZE - 1,
    }, function (error, events) { if (error) console.log(error); }
    )
    let newRecordsCreated = false

    events.forEach(async event => {
      let de = await DepositEvent.findOne({ txHash: event.transactionHash })
      console.log(de)
      if (de) {
        console.log('found')
      } else {
        console.log('not found')
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
        })
        let de = new DepositEvent({
          txHash: event.transactionHash,
          status: "NEW",
          event: bes,
        })
        await de.save(function (err) {
          if (err) console.log(err)
        })
        console.log("saved")
        newRecordsCreated = true
      }
    })
    if (!newRecordsCreated) {
      cs.watcherBlockHeight = cs.watcherBlockHeight + CHUNK_SIZE
      await cs.save()
      // cs.update({watcherBlockHeight: cs.watcherBlockHeight + CHUNK_SIZE})
      console.log(cs.watcherBlockHeight)
    }

    console.log(events)
    watcherLock = 0
  }
  setInterval(watcherLoop, 1000)
}
watcher()

// TODO: Look into why the following error occurs
/* 
(node:1241) UnhandledPromiseRejectionWarning: ParallelSaveError: Can't save() the same doc multiple times in parallel. Document: 6243243e7383adb419896fef
    at model.Model.save (/Users/henryminden/canopy-exchange-watcher/node_modules/mongoose/lib/model.js:491:20)
    at Timeout.watcherLoop [as _onTimeout] (/Users/henryminden/canopy-exchange-watcher/dist/src/watcher.js:89:22)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
(Use `node --trace-warnings ...` to show where the warning was created)
*/