"use strict";
// Object.defineProperty(exports, "__esModule", { value: true });
// import Web3 from 'web3'
// const web3 = new Web3('https://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4')
// const ABI = ''
// const CONTRACT_ADDRESS = ''
// const myContract = new Web3.eth.Contract
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_1 = __importDefault(require("web3"));
const CanopyVault_json_1 = __importDefault(require("./abi/CanopyVault.json"));
const AuroraMint_json_1 = __importDefault(require("./abi/AuroraMint.json"));
var web3Polygon = new web3_1.default('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');
var web3Aurora = new web3_1.default('wss://testnet.aurora.dev');
const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const { abi: canopyAbi } = CanopyVault_json_1.default;
const vaultContract = new web3Polygon.eth.Contract(CanopyVault_json_1.default.abi, '0x0e8DEF110b1fC3F649ebCd21871E8bfb2f14244D');
const mintContract = new web3Aurora.eth.Contract(AuroraMint_json_1.default.abi, '0x22fF3411a761E1B795BE66902DEC86B7AA405444');
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
    let to = event.returnValues.from;
    let amount = event.returnValues.amount;
    let encodedABI = mintContract.methods.mint(to, amount).encodeABI();
    console.log(event);
    console.log("-");
    console.log(nonce);
    let signedTx = await auroraAccount.signTransaction({
        nonce: nonce,
        to: '0x22fF3411a761E1B795BE66902DEC86B7AA405444',
        data: encodedABI,
        gas: 2000000,
        chainId: 1313161555
    });
    let send = await web3Aurora.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(send);
}
vaultContract.events.Deposit(vaultOptions)
    .on('data', async (event) => await processDeposit(event))
    .on('changed', changed => console.log(changed))
    .on('error', err => { throw err; })
    .on('connected', str => console.log(str));
//# sourceMappingURL=main.js.map