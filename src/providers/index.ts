import Web3 from "web3";

const { POLYGON_PROVIDER, AURORA_PROVIDER } = process.env;

export const web3Polygon = new Web3(POLYGON_PROVIDER);
export const web3Aurora = new Web3(AURORA_PROVIDER);
