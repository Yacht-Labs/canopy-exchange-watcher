import Web3 from "web3";
import { AbiItem } from "web3-utils";
import auroraMint from "./abi/AuroraMint.json";
import mongoose from "mongoose";
import "dotenv/config";
import { DepositEvent } from "./model";

const web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/z8rzbsshgvAjR1SpHL8zWgGoHDdBZXFm');

const {
    DATABASE_URL,
    AURORA_PROVIDER,
    MINT_CONTRACT_ADDRESS,
} = process.env;

var web3Aurora = new Web3(AURORA_PROVIDER);

let mintContract = new web3Aurora.eth.Contract(
    auroraMint.abi as AbiItem[],
    MINT_CONTRACT_ADDRESS
);

const mintConfirmer = async () => {

    await mongoose.connect(DATABASE_URL);

    async function mintConfirmerLoop() {
        let minterConfirmerLock = 0;
        async function lockMinter() {
            if (minterConfirmerLock == 0) {
                minterConfirmerLock = 1;
                return true;
            } else {
                return false;
            }
        }
        let locked = await lockMinter();
        if (locked === false) {
            console.log("locked");
            return;
        }
        // Find last DepositEvents with status MINTING
        let event = await DepositEvent.findOne({ status: "MINTING" });
        console.log("found event: " + event)
        if (!event) {
            console.log("no more events found!")
            return;
        }

        let [mintEvent] = await mintContract.getPastEvents("Mint", {
            topics: ['0x4e3883c75cc9c752bb1db2e406a822e4a75067ae77ad9a0a4d179f2709b9e1f6', event.txHash],
        });
        console.log("found mint event: " + mintEvent)
        if (!mintEvent) {
            // If we don't find a mint event we will retry 3 times
            let mintConfirmRetries = event.mintConfirmRetries;
            if(!mintConfirmRetries) {
                // Set to 1 if 0 or doesn't exist on event
                console.log("Deposit %s has retried once!", event.mintTxHash)
                event.mintConfirmRetries = 1;
                event.save();
                minterConfirmerLock = 0;
            } else if (mintConfirmRetries < 3) {
                // Increment the retries if there are less than 3
                mintConfirmRetries++;
                console.log("Deposit %s has retried %s times!", event.mintTxHash, mintConfirmRetries)
                event.mintConfirmRetries = mintConfirmRetries;
                event.save();
                minterConfirmerLock = 0;
            } else {
                // If we have retried 3 times mark it as failed
                console.log("Deposit %s has failed!", event.mintTxHash)
                event.status = "MINT_FAILED";
                event.save();
                minterConfirmerLock = 0;
            }

        } else {
            console.log("Deposit %s has been minted!", mintEvent.transactionHash)
            event.mintTxHash = mintEvent.transactionHash;
            event.status = "MINTED";
            event.save();
            minterConfirmerLock = 0;
        }


    }
    setInterval(mintConfirmerLoop, 2000);

};
mintConfirmer();