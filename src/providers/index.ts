import Web3 from "web3";

const { ORIGIN_PROVIDER, DESTINATION_PROVIDER } = process.env;

export const web3Origin = new Web3(ORIGIN_PROVIDER);
export const web3Destination = new Web3(DESTINATION_PROVIDER);
