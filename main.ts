// Object.defineProperty(exports, "__esModule", { value: true });
// import Web3 from 'web3'
// const web3 = new Web3('https://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4')
// const ABI = ''
// const CONTRACT_ADDRESS = ''
// const myContract = new Web3.eth.Contract

import Web3 from 'web3'; 
import { AbiItem } from 'web3-utils'

import canopyVault from './abi/CanopyVault.json'
import auroraMint from './abi/AuroraMint.json'
var web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');
var web3Aurora = new Web3('wss://testnet.aurora.dev');

const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const {abi: canopyAbi} = canopyVault
const vaultContract = new web3Polygon.eth.Contract(canopyVault.abi as AbiItem[], '0x0e8DEF110b1fC3F649ebCd21871E8bfb2f14244D');
const mintContract = new web3Aurora.eth.Contract(auroraMint.abi as AbiItem[], '0x22fF3411a761E1B795BE66902DEC86B7AA405444');
const auroraAccount = web3Aurora.eth.accounts.privateKeyToAccount(DEV_ACCOUNT_PRIVATE_KEY);

let vaultOptions = {
  filter: {
      value: [],
  },
  fromBlock: 0
};
let mintOptions = {
  filter: {
      value: [],
  },
  fromBlock: 0
};
//TODO: Fix nonce logic

async function processDeposit(event) {
  let nonce = await web3Aurora.eth.getTransactionCount(auroraAccount.address);
  let to = event.returnValues.from
  let amount = event.returnValues.amount
  let encodedABI = await mintContract.methods.mint(to, amount).encodeABI()
  console.log("-")
  console.log(nonce);
  let signedTx = await auroraAccount.signTransaction({
      nonce: nonce,
      to: '0x22fF3411a761E1B795BE66902DEC86B7AA405444',
      data: encodedABI,
      gas: 2000000,
      chainId: 1313161555
  })
  
  let send = await web3Aurora.eth.sendSignedTransaction(signedTx.rawTransaction)
  console.log(send)
}

vaultContract.events.Deposit(vaultOptions)
    .on('data', async (event) => await processDeposit(event))
    .on('changed', changed => console.log(changed))
    .on('error', err => {throw err})
    .on('connected', str => console.log(str))
