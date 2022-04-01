//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts/proxy/Clones.sol";
import "./HackedFirst.sol";

contract HackedFirstFactory {
        
    address public immutable governance;
    address public immutable implementation;

    event NewHackedFirstContract(address indexed _instance);

    constructor(address _implementation, address _governance) {
        implementation = _implementation;
        governance = _governance;
    }

    function createHackedFirstContract(address _hacker, address _committee, address _beneficiary) external {
        address hacker = _hacker;
        if (hacker == address(0)) hacker = msg.sender;
        address payable newContract = payable(Clones.clone(implementation));
        HackedFirst(newContract).initialize(hacker, _committee, _beneficiary, governance);

        emit NewHackedFirstContract(address(newContract));
    }
}
