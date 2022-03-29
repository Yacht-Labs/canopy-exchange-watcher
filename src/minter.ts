
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import auroraMint from '../abi/AuroraMint.json'
import mongoose from 'mongoose';
import 'dotenv/config'
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";
const { DATABASE_URL } = process.env
const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";

var web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');
var web3Aurora = new Web3("wss://testnet.aurora.dev");

let mintAccount = web3Aurora.eth.accounts.privateKeyToAccount(DEV_ACCOUNT_PRIVATE_KEY);
let mintContract = new web3Aurora.eth.Contract(auroraMint.abi as AbiItem[], '0x8173cf5551eC2E96489427c4073476b7f33C2b5e')
mintContract.defaultAccount = mintAccount.address
const minter = async () => {
    let minterLock = 0;
    async function lockMinter() {
        if (minterLock == 0) {
            minterLock = 1
            return true
        } else {
            return false
        }
    }
    await mongoose.connect(DATABASE_URL);
    let cs = await ChainStatus.find()[0]
    async function minterLoop() {
        let lockStatus = await lockMinter()
        if (lockStatus == false) {
            console.log("locked")
            return
        }

        let depositEvents = await DepositEvent.find({ status: "NEW" })
        depositEvents.forEach(async event => {
            // check if tx still exists on origin chain
            let tx = await web3Polygon.eth.getTransaction(event.txHash)
            if (!tx) {
                console.log("failed to find origin tx")
                event.status = "DEPOSIT_FAILED"
                event.failureReason = "origin chain tx lookup failed when minting"
                await event.save()
                return
            }
            // check for MintEvent on destination chain with DepositEvent.txHash
            console.log("calling getPastEvents on contract")
            let me = await mintContract.getPastEvents('Mint', {
                filter: { txHash: event.txHash }
            })[0]
            // call mint() contract on destination chain if MintEvent doesn't exist
            if (!me) {
                await mintContract.methods.mintWithEvent.send({
                    // TODO: use 'to' address from DepositEvent
                    address: event.event.from,
                    amount: event.event.amount,
                    txHash: event.txHash
                }).on('receipt', function (receipt) {
                    console.log("minted")
                    console.log(receipt)
                    event.mintTxHash = receipt.transactionHash
                    event.status = 'MINTING'
                    event.save()
                })
                console.log("finished minting")
            }
        })
        minterLock = 0
    }
    setInterval(minterLoop, 1000)
}
minter()
