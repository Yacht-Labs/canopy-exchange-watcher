
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import canopyVault from './abi/CanopyVault.json'
import auroraMint from './abi/AuroraMint.json'
import mongoose from 'mongoose';
import 'dotenv/config'
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";

var web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');

const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const { abi: canopyAbi } = canopyVault
const vaultContract = new web3Polygon.eth.Contract(canopyVault.abi as AbiItem[], '0x0e8DEF110b1fC3F649ebCd21871E8bfb2f14244D');
const { DATABASE_URL } = process.env

async function getChainStatus() {
  console.log(DATABASE_URL)
  await mongoose.connect(DATABASE_URL);
  console.log("connected")
  let res = await ChainStatus.find()
  console.log(res)
  console.log("----")
  console.log(res[0])
  return res[0]
}

async function watchBlock() {
  let cs = await getChainStatus()

  let events = await vaultContract.getPastEvents('Deposit', {
    fromBlock: cs.watcherBlockHeight,
    toBlock: cs.watcherBlockHeight,
  })

  console.log(events)
}

watchBlock()