let minterLock = 0;

function lockMinter() {
  if (minterLock === 0) {
    minterLock = 1;
    return true;
  } else {
    return false;
  }
}

let mintConfirmerLock = 0;
async function lockMinter() {
  if (mintConfirmerLock == 0) {
    mintConfirmerLock = 1;
    return true;
  } else {
    return false;
  }
}
