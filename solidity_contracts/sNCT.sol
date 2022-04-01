// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";


contract sNCT is ERC20PresetMinterPauser {

    event Burn(uint256 amount, address from);

    event Mint(uint256 amount, address to, uint256 indexed txHash);

    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser (name, symbol) {}

    function burn(uint256 amount) override public {
        ERC20Burnable.burn(amount);
        emit Burn(amount, msg.sender);
    }

    function mintWithEvent(address to, uint256 amount, uint256 txHash) public {
        ERC20PresetMinterPauser.mint(to, amount);
        emit Mint(amount, to, txHash);
    } 

}