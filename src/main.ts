// Object.defineProperty(exports, "__esModule", { value: true });
// import Web3 from 'web3'
// const web3 = new Web3('https://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4')
// const ABI = ''
// const CONTRACT_ADDRESS = ''
// const myContract = new Web3.eth.Contract

import Web3 from "web3";
import { AbiItem } from "web3-utils";
import "dotenv/config";
import canopyVault from "./abi/CanopyVault.json";
import auroraMint from "./abi/AuroraMint.json";
const {
  POLYGON_PROVIDER,
  AURORA_PROVIDER,
  AURORA_PRIVATE_KEY,
  VAULT_CONTRACT_ADDRESS,
  MINT_CONTRACT_ADDRESS,
} = process.env;
var web3Polygon = new Web3(POLYGON_PROVIDER);
var web3Aurora = new Web3(AURORA_PROVIDER);

const { abi: canopyAbi } = canopyVault;
const vaultContract = new web3Polygon.eth.Contract(
  canopyVault.abi as AbiItem[],
  VAULT_CONTRACT_ADDRESS
);
const mintContract = new web3Aurora.eth.Contract(
  auroraMint.abi as AbiItem[],
  MINT_CONTRACT_ADDRESS
);

const auroraAccount =
  web3Aurora.eth.accounts.privateKeyToAccount(AURORA_PRIVATE_KEY);

let vaultOptions = {
  filter: {
    value: [],
  },
  fromBlock: 0,
};
let mintOptions = {
  filter: {
    value: [],
  },
  fromBlock: 0,
};
//TODO: Fix nonce logic

async function processDeposit(event) {
  let nonce = await web3Aurora.eth.getTransactionCount(auroraAccount.address);
  let to = event.returnValues.from;
  let amount = event.returnValues.amount;
  let encodedABI = mintContract.methods.mint(to, amount).encodeABI();
  console.log(event);
  console.log("-");
  console.log(nonce);
  let signedTx = await auroraAccount.signTransaction({
    nonce: nonce,
    to: MINT_CONTRACT_ADDRESS,
    data: encodedABI,
    gas: 2000000,
    chainId: 1313161555,
  });

  let send = await web3Aurora.eth.sendSignedTransaction(
    signedTx.rawTransaction
  );
  console.log(send);
}

vaultContract.events
  .Deposit(vaultOptions)
  .on("data", async (event) => await processDeposit(event))
  .on("changed", (changed) => console.log(changed))
  .on("error", (err) => {
    throw err;
  })
  .on("connected", (str) => console.log(str));
