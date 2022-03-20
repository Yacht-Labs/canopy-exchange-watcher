"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_1 = __importDefault(require("web3"));
const CanopyVault_json_1 = __importDefault(require("./abi/CanopyVault.json"));
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const model_1 = require("./model");
var web3Polygon = new web3_1.default('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');
const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const { abi: canopyAbi } = CanopyVault_json_1.default;
const vaultContract = new web3Polygon.eth.Contract(CanopyVault_json_1.default.abi, '0x0e8DEF110b1fC3F649ebCd21871E8bfb2f14244D');
const { DATABASE_URL } = process.env;
async function getChainStatus() {
    console.log(DATABASE_URL);
    await mongoose_1.default.connect(DATABASE_URL);
    console.log("connected");
    let res = await model_1.ChainStatus.find();
    console.log(res);
    console.log("----");
    console.log(res[0]);
    return res[0];
}
async function watchBlock() {
    let cs = await getChainStatus();
    let events = await vaultContract.getPastEvents('Deposit', {
        fromBlock: cs.watcherBlockHeight,
        toBlock: cs.watcherBlockHeight,
    });
    console.log(events);
}
watchBlock();
//# sourceMappingURL=watcher.js.map