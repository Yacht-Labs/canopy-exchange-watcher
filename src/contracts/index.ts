import { web3Aurora, web3Polygon } from "../providers";
import canopyVault from "../abis/CanopyVault.json";
import auroraMint from "../abis/AuroraMint.json";
import { AbiItem } from "web3-utils";

const { VAULT_CONTRACT_ADDRESS, MINT_CONTRACT_ADDRESS } = process.env;

export const vaultContract = new web3Polygon.eth.Contract(
  canopyVault.abi as AbiItem[],
  VAULT_CONTRACT_ADDRESS
);
export const mintContract = new web3Aurora.eth.Contract(
  auroraMint.abi as AbiItem[],
  MINT_CONTRACT_ADDRESS
);