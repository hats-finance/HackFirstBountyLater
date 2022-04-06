//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract HackFirst is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public hacker;
    address public committee;
    address public hats;
    bool public committeeCheckedIn;

    uint256 public constant HUNDRED_PERCENT = 10000;
    uint256 public constant MINIMUM_BOUNTY = 1000;

    event CommitteeCheckedIn();
    event CommitteeChanged(address indexed _newCommitte);
    event FundsRetrieved(address indexed _beneficiary, address indexed _token, uint256 _bounty, uint256 _rewardForHats);

    modifier onlyCommittee() {
        require(msg.sender == committee, "Only committee");
        _;
    }

    constructor() initializer {}

    receive() external payable {}

    function initialize(address _hacker, address _committee, address _hats) external initializer {
        require(_committee != address(0), "Must have committee");
        hacker = _hacker;
        committee = _committee;
        hats = _hats;
    }

    function changeCommittee(address _committee) external {
        require(msg.sender == committee || (msg.sender == hacker && !committeeCheckedIn), "Only committee or hacker");
        committee = _committee;
        emit CommitteeChanged(_committee);
    }

    function committeeCheckIn() external onlyCommittee {
        committeeCheckedIn = true;
        emit CommitteeCheckedIn();
    }

    function retrieveFunds(
        address _beneficiary,
        uint256 _bounty,
        uint256 _rewardForHats,
        address _token
    ) external onlyCommittee nonReentrant {
        require(committeeCheckedIn, "Committee must check in first");
        require(_bounty >= MINIMUM_BOUNTY, "Bounty must be at least 10%");
        uint256 returnedToBeneficiary = HUNDRED_PERCENT - (_bounty + _rewardForHats);
        if (_token == address(0)) {
            uint256 totalReward = address(this).balance;
            require(totalReward > 0, "No ETH in the contract");
            sendETHReward(hacker, _bounty, totalReward);

            if (_rewardForHats > 0) {
                sendETHReward(hats, _rewardForHats, totalReward);
            }

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                sendETHReward(_beneficiary, returnedToBeneficiary, totalReward);
            }
        } else {
            // tranfer all _token held by this contract to the different parties
            uint256 totalReward = IERC20(_token).balanceOf(address(this));
            require(totalReward > 0, "No tokens in the contract");
            IERC20(_token).safeTransfer(hacker, _bounty * totalReward / HUNDRED_PERCENT);

            if (_rewardForHats > 0) {
                IERC20(_token).safeTransfer(hats, _rewardForHats * totalReward / HUNDRED_PERCENT);

            }

            if (returnedToBeneficiary > 0) {
                require(_beneficiary != address(0), "Cannot send to 0 address");
                IERC20(_token).safeTransfer(_beneficiary, returnedToBeneficiary * totalReward / HUNDRED_PERCENT);
            }
        }
        emit FundsRetrieved(_beneficiary, _token, _bounty, _rewardForHats);
    }

    function sendETHReward(address _to, uint256 _rewardPercentage, uint256 _totalReward) internal {
        (bool sent,) = _to.call{value: _rewardPercentage * _totalReward / HUNDRED_PERCENT}("");
        require(sent, "Failed to send ETH");
    }
}