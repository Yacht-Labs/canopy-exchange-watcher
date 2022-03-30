import Web3 from "web3";
import { AbiItem } from "web3-utils";
import auroraMint from "./abi/AuroraMint.json";
import web3Polygon from "./providers/web3Polygon";
import mongoose from "mongoose";
import "dotenv/config";
import { ChainStatus, DepositEvent } from "./model";

const {
    DATABASE_URL,
    AURORA_PRIVATE_KEY,
    AURORA_PUBLIC_KEY,
    AURORA_PROVIDER,
    MINT_CONTRACT_ADDRESS,
} = process.env;

var web3Aurora = new Web3(AURORA_PROVIDER);

let mintContract = new web3Aurora.eth.Contract(
    auroraMint.abi as AbiItem[],
    MINT_CONTRACT_ADDRESS
);

const minter = async () => {
    let minterLock = 0;
    async function lockMinter() {
        if (minterLock == 0) {
            minterLock = 1;
            return true;
        } else {
            return false;
        }
    }
    await mongoose.connect(DATABASE_URL);
    let cs = await ChainStatus.find()[0];
    async function minterLoop() {
        let locked = await lockMinter();
        if (locked === false) {
            console.log("locked");
            return;
        }

        const event = await DepositEvent.findOne({ status: "NEW" });
        // check if tx still exists on origin chain
        let tx = await web3Polygon.eth.getTransaction(event.txHash);
        if (!tx) {
            console.log("failed to find origin tx");
            event.status = "DEPOSIT_FAILED";
            event.failureReason = "origin chain tx lookup failed when minting";
            await event.save();
            return;
        }
        // check for MintEvent on destination chain with DepositEvent.txHash
        console.log("calling getPastEvents on contract for tx: %s", event.txHash);
        let [mintEvent] = await mintContract.getPastEvents("Mint", {
            filter: { txHash: event.txHash },
        });
        console.log("Me: %s", mintEvent);
        // call mint() contract on destination chain if MintEvent doesn't exist
        if (!mintEvent) {
            console.log("Starting mint");

            const gasPrice = await web3Aurora.eth.getGasPrice();
            const gasPriceFormatted = web3Aurora.utils.fromWei(gasPrice, "ether");
            mintContract.handleRevert = true;

            const gasAmount = await mintContract.methods
                .mintWithEvent(event.event.from, 50, 5000)
                .estimateGas({ gas: 5000000 });
            console.log("Gas amount estimate", gasAmount);

            const nonce = await web3Aurora.eth.getTransactionCount(AURORA_PUBLIC_KEY);
            console.log("Nonce", nonce);

            const tx = {
                nonce: nonce,
                from: AURORA_PUBLIC_KEY,
                to: MINT_CONTRACT_ADDRESS,
                gas: 1817240,
                gasPrice: 10,
                chainId: 1313161555,
                data: mintContract.methods
                    .mintWithEvent(event.event.from, event.event.amount, BigInt(event.event.txHash))
                    .encodeABI(),
            };
            console.log("Tx: %s", tx);
            const signedTx = await web3Aurora.eth.accounts.signTransaction(
                tx,
                AURORA_PRIVATE_KEY,
                (err, res) => {
                    console.log("Err %s", err);
                    console.log("Res %s", res);
                }
            );
            console.log("signed Tx: %s", signedTx);

            web3Aurora.eth
                .sendSignedTransaction(signedTx.rawTransaction)
                .on("error", (err) => {
                    console.log("On error: %s", err);
                })
                .on("receipt", (receipt) => {
                    console.log("minted");
                    console.log({ receipt });
                    minterLock = 0;
                    event.mintTxHash = receipt.transactionHash;
                    event.status = "MINTING";
                    event.save();
                });
            console.log("finished minting");
        } else {
            event.mintTxHash = mintEvent.transactionHash;
            event.status = "MINTING";
            event.save();
        }
    }
    setInterval(minterLoop, 4000);
};
minter();
