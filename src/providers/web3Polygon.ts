import { createAlchemyWeb3 } from "@alch/alchemy-web3";
import "dotenv/config";

const { POLYGON_PROVIDER } = process.env;

export default createAlchemyWeb3(POLYGON_PROVIDER);
