//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./HackFirst.sol";

contract HackFirstFactory {
        
    address public immutable implementation;

    event NewHackFirstContract(address indexed _instance, address indexed _hacker, address indexed _owner);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    /*
     * @dev create a new HackFirst instance
     * @param _hacker – the address that will receive the bounty
     * @param _owner - the address that will control who will get the funds sent to the address, and the size of the bounty for the hacker
     */
    function createHackFirstContract(address _hacker, address _owner) external {
        address hacker = _hacker;
        if (hacker == address(0)) hacker = msg.sender;
        address payable newContract = payable(ClonesUpgradeable.clone(implementation));
        HackFirst(newContract).initialize(hacker, _owner);

        emit NewHackFirstContract(address(newContract), hacker, _owner);
    }
}
 