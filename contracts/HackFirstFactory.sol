//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./HackFirst.sol";

contract HackFirstFactory {
        
    address public immutable implementation;

    event NewHackFirstContract(address indexed _instance, address indexed _hacker, address indexed _committee);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createHackFirstContract(address _hacker, address _committee) external {
        address hacker = _hacker;
        if (hacker == address(0)) hacker = msg.sender;
        address payable newContract = payable(ClonesUpgradeable.clone(implementation));
        HackFirst(newContract).initialize(hacker, _committee);

        emit NewHackFirstContract(address(newContract), hacker, _committee);
    }
}
 