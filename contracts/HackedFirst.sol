//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;


import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract HackedFirst is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public hacker;
    address public beneficiary;
    address public committee;
    address public governance ;
    uint256 public constant HUNDRED_PERCENT = 10000;
    uint256 public constant MINIMUM_BOUNTY = 1000;

    event BeneficiaryChanged(address indexed _newBeneficiary);
    event FundsRetrieved(address indexed _token, uint256 _bounty, uint256 _rewardForCommittee, uint256 _rewardForGovernance);

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Only beneficiary");
        _;
    }

    modifier onlyCommittee() {
        require(msg.sender == committee, "Only committee");
        _;
    }

    constructor() initializer {}

    receive() external payable {}

    function initialize(address _hacker, address _committee, address _beneficiary, address _governance) external initializer {
        require(_committee != address(0) || _beneficiary != address(0), "Must have committee or beneficiary");
        hacker = _hacker;
        committee = _committee;
        beneficiary = _beneficiary;
        governance = _governance;
    }

    function setBeneficiary(address _beneficiary) external onlyCommittee {
        beneficiary = _beneficiary;
        emit BeneficiaryChanged(_beneficiary);
    }

    function retrieveFunds(
        uint256 _bounty,
        uint256 _rewardForCommittee,
        uint256 _rewardForGovernance,
        address _token
    ) external onlyBeneficiary nonReentrant {
        require(_bounty >= MINIMUM_BOUNTY, "Bounty must be at least 10%");
        uint256 returnedToBeneficiary = HUNDRED_PERCENT - (_bounty + _rewardForCommittee + _rewardForGovernance);
        if (_token == address(0)) {
            uint256 totalReward = address(this).balance;
            require(totalReward > 0, "No ETH in the contract");
            sendETHReward(hacker, _bounty, totalReward);

            if (_rewardForCommittee > 0) {
                require(committee != address(0), "Cannot tip 0 address");
                sendETHReward(committee, _rewardForCommittee, totalReward);
            }

            if (_rewardForGovernance > 0) {
                sendETHReward(governance, _rewardForGovernance, totalReward);
            }

            if (returnedToBeneficiary > 0) {
                sendETHReward(beneficiary, returnedToBeneficiary, totalReward);
            }
        } else {
            // tranfer all _token held by this contract to the different parties
            uint256 totalReward = IERC20(_token).balanceOf(address(this));
            require(totalReward > 0, "No tokens in the contract");
            IERC20(_token).safeTransfer(hacker, _bounty * totalReward / HUNDRED_PERCENT);

            if (_rewardForCommittee > 0) {
                require(committee != address(0), "Cannot tip 0 address");
                IERC20(_token).safeTransfer(committee, _rewardForCommittee * totalReward / HUNDRED_PERCENT);
            }

            if (_rewardForGovernance > 0) {
                IERC20(_token).safeTransfer(governance, _rewardForGovernance * totalReward / HUNDRED_PERCENT);

            }

            if (returnedToBeneficiary > 0) {
                IERC20(_token).safeTransfer(beneficiary, returnedToBeneficiary * totalReward / HUNDRED_PERCENT);
            }
        }
        emit FundsRetrieved(_token, _bounty, _rewardForCommittee, _rewardForGovernance);
    }

    function sendETHReward(address _to, uint256 _rewardPercentage, uint256 _totalReward) internal {
        (bool sent,) = _to.call{value: _rewardPercentage * _totalReward / HUNDRED_PERCENT}("");
        require(sent, "Failed to send ETH");
    }
}