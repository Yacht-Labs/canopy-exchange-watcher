
import Web3 from 'web3';
import { AbiItem } from 'web3-utils'
import auroraMint from '../abi/AuroraMint.json'
import mongoose from 'mongoose';
import 'dotenv/config'
import { BlockchainEvent, ChainStatus, DepositEvent } from "./model";
const { DATABASE_URL } = process.env
const DEV_ACCOUNT_PRIVATE_KEY = "81c7e751ce18f0e39f8881e1d4071ff851d6825988742a0569941049d7a1df38";
const DEV_ACCOUNT_ADDRESS = "0xc41df6bA129067291F61c7f3dBcad9227E3fba57";

var web3Polygon = new Web3('wss://polygon-mumbai.g.alchemy.com/v2/dkKU4lXpEdN0xvwo4-fLyLMvBqB3MzK4');
var web3Aurora = new Web3("wss://testnet.aurora.dev");

let mintContract = new web3Aurora.eth.Contract(auroraMint.abi as AbiItem[], '0x8173cf5551eC2E96489427c4073476b7f33C2b5e')

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
        let locked = false;
        depositEvents.forEach(async event => {
            if(!locked){
                locked = true
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
            console.log("calling getPastEvents on contract for tx: %s", event.txHash)
            let me = await mintContract.getPastEvents('Mint', {
                filter: { txHash: event.txHash }
            })[0]
            console.log("Me: %s", me);
            // call mint() contract on destination chain if MintEvent doesn't exist
            if (!me) {
                console.log("Starting mint");

                const gasPrice = await web3Aurora.eth.getGasPrice();
                const gasPriceFormatted = web3Aurora.utils.fromWei(gasPrice, 'ether')
                mintContract.handleRevert = true  
                const tx = {
                    from: DEV_ACCOUNT_ADDRESS, 
                    to: "0x8173cf5551eC2E96489427c4073476b7f33C2b5e", 
                    gas: "10000000000000000",
                    data: mintContract.methods.mintWithEvent(event.event.from, 50, 5000).encodeABI() 
                };
                console.log("Tx: %s", tx);
                const signedTx = await web3Aurora.eth.accounts.signTransaction(tx, DEV_ACCOUNT_PRIVATE_KEY, (err, res) => {
                    console.log("Err %s",err);
                    console.log("Res %s",res);
                } );
                console.log("signed Tx: %s", signedTx);

                try {
                    web3Aurora.eth.sendSignedTransaction(signedTx.rawTransaction)
                  //  .on("error", err => {
                  //      console.log("On error: %s", err)
                  //  })
                    .on("receipt", receipt => {
                        console.log("minted")
                        console.log(receipt)
                        //event.mintTxHash = receipt.transactionHash
                        //event.status = 'MINTING'
                        //event.save()
                    })
                }  catch (e) {
                    mintContract.methods.mintWithEvent(event.event.from, 50, 5000)
                        .call({'from': web3Aurora.eth.accounts.privateKeyToAccount(DEV_ACCOUNT_PRIVATE_KEY)}).then(() => {
                        throw Error ('reverted tx')})
                        .catch(revertReason => console.log({revertReason}))
                    
                }      
    
                
                
                   
                
                console.log("finished minting")
                /*
                web3Aurora.eth.sendSignedTransaction(signedTx.rawTransaction)
                    .on("receipt", receipt => {
                        console.log("minted")
                        console.log(receipt)
                        event.mintTxHash = receipt.transactionHash
                        event.status = 'MINTING'
                        event.save()
                    })
                    .on("error", err => {
                        console.log("On error: %s", err)
                    })
                    .catch((err) => {
                        console.log("Caught error: %s", err)
                    });
                    */
            }
            
                
                   
            }
        })
        minterLock = 0
    }
    //setInterval(minterLoop, 1000)
    minterLoop()
}
minter()
