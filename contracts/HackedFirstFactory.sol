//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts/proxy/Clones.sol";
import "./HackedFirst.sol";

contract HackedFirstFactory {
        
    address public immutable hats;
    address public immutable implementation;

    event NewHackedFirstContract(address indexed _instance, address indexed _hacker, address indexed _committee);

    constructor(address _implementation, address _hats) {
        implementation = _implementation;
        hats = _hats;
    }

    function createHackedFirstContract(address _hacker, address _committee) external {
        address hacker = _hacker;
        if (hacker == address(0)) hacker = msg.sender;
        address payable newContract = payable(Clones.clone(implementation));
        HackedFirst(newContract).initialize(hacker, _committee, hats);

        emit NewHackedFirstContract(address(newContract), hacker, _committee);
    }
}
 