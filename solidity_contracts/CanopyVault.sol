// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract CanopyVault {

    address public owner;

    // maps the balances of each account (per token )
    // token => user wallet => amount 
    mapping(IERC20 => mapping(address => uint256)) balances;

    event Deposit(address from, uint256 amount, IERC20 token);

    constructor() {
        owner = msg.sender;
    }

    function bridgeToken(uint256 amount, IERC20 token) external {
        require(amount > 0, "Amount must be positive");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient funds");

        token.transferFrom(msg.sender, address(this), amount);
        balances[token][msg.sender] += amount;

        emit Deposit(msg.sender, amount, token);
    }

}