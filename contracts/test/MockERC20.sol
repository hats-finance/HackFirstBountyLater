// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract MockERC20 is ERC20Upgradeable {
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor() initializer {
        __ERC20_init("MockERC20", "MOCK");
        _mint(msg.sender, 10000000000000000000);
    }
}