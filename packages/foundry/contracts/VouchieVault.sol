// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./VouchieBadge.sol";

/**
 * @title VouchieVault
 * @notice Vouchie: The Social Accountability Protocol.
 * @dev "Social Insurance" logic with Lazy Tax, Status Tax, and Streak Freeze.
 */
contract VouchieVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    VouchieBadge public badgeContract;

    // --- Config ---
    address public treasury;
    uint256 public lazyTaxBps = 1000; // 10%
    uint256 public extensionFee = 5 ether; // Fixed fee for streak freeze
    uint256 public extensionDuration = 12 hours;
    uint256 public badgeFee = 2 ether; // Fee to mint badge

    struct Goal {
        uint256 id;
        address creator;
        uint256 stakeAmount;
        uint256 deadline;
        string description;
        address[] vouchies;
        bool resolved;
        bool successful;
        uint256 votesValid;
        uint256 votesInvalid;
        mapping(address => bool) hasVoted;
    }

    uint256 public goalCount;
    mapping(uint256 => Goal) public goals;
    mapping(uint256 => mapping(address => bool)) public vouchiesClaimed; 

    event GoalCreated(uint256 indexed goalId, address indexed creator, uint256 stakeAmount, uint256 deadline, string description);
    event VoteCast(uint256 indexed goalId, address indexed voter, bool isValid);
    event GoalResolved(uint256 indexed goalId, bool successful);
    event FundsClaimed(uint256 indexed goalId, address indexed claimant, uint256 amount);
    event GoalCanceled(uint256 indexed goalId, address indexed creator, uint256 refundAmount);
    event GoalExtended(uint256 indexed goalId, uint256 newDeadline, uint256 addedStake);
    event StreakFrozen(uint256 indexed goalId, uint256 newDeadline, uint256 feePaid);
    event BadgeClaimed(uint256 indexed goalId, address indexed creator, uint256 tokenId);
    event ConfigUpdated(address treasury, uint256 lazyTaxBps, uint256 extensionFee, uint256 badgeFee);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
        treasury = msg.sender; // Default treasury
    }

    // --- Admin ---
    function setConfig(address _treasury, uint256 _lazyTaxBps, uint256 _extensionFee, uint256 _badgeFee, uint256 _extensionDuration) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        require(_lazyTaxBps <= 10000, "Invalid BPS");
        treasury = _treasury;
        lazyTaxBps = _lazyTaxBps;
        extensionFee = _extensionFee;
        badgeFee = _badgeFee;
        extensionDuration = _extensionDuration;
        emit ConfigUpdated(_treasury, _lazyTaxBps, _extensionFee, _badgeFee);
    }

    function setBadgeContract(address _badgeContract) external onlyOwner {
        badgeContract = VouchieBadge(_badgeContract);
    }

    // --- Core ---

    function createGoal(
        uint256 _amount,
        uint256 _duration,
        string calldata _description,
        address[] calldata _vouchies
    ) external nonReentrant {
        require(_amount > 0, "Stake must be > 0");
        require(_vouchies.length > 0, "Vouchies cannot be empty");
        require(_duration > 0, "Duration must be > 0");

        for (uint256 i = 0; i < _vouchies.length; i++) {
            require(_vouchies[i] != msg.sender, "Creator cannot be in vouchies");
        }

        token.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 goalId = goalCount++;
        Goal storage newGoal = goals[goalId];
        newGoal.id = goalId;
        newGoal.creator = msg.sender;
        newGoal.stakeAmount = _amount;
        newGoal.deadline = block.timestamp + _duration;
        newGoal.description = _description;
        newGoal.vouchies = _vouchies;

        emit GoalCreated(goalId, msg.sender, _amount, newGoal.deadline, _description);
    }

    function cancelGoal(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(!goal.resolved, "Already resolved");
        require(goal.votesValid == 0 && goal.votesInvalid == 0, "Cannot cancel after voting started");

        goal.resolved = true;
        
        uint256 refund = goal.stakeAmount;
        goal.stakeAmount = 0;
        token.safeTransfer(msg.sender, refund);
        
        emit GoalCanceled(_goalId, msg.sender, refund);
    }

    // Strategy 3: Streak Freeze (Pay to Protocol to Extend)
    function streakFreeze(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(!goal.resolved, "Already resolved");

        token.safeTransferFrom(msg.sender, treasury, extensionFee);
        
        goal.deadline += extensionDuration;
        emit StreakFrozen(_goalId, goal.deadline, extensionFee);
    }

    // Original Extension (Pay to Pot to Extend)
    function extendGoal(uint256 _goalId, uint256 _additionalDuration, uint256 _addedStake) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(!goal.resolved, "Already resolved");
        require(_addedStake > 0, "Must pay premium to extend");
        require(_additionalDuration > 0, "Must extend duration");

        token.safeTransferFrom(msg.sender, address(this), _addedStake);

        goal.stakeAmount += _addedStake;
        goal.deadline += _additionalDuration;

        emit GoalExtended(_goalId, goal.deadline, _addedStake);
    }

    function vote(uint256 _goalId, bool _isValid, uint256 _vouchieIndex) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(!goal.resolved, "Goal already resolved");
        require(_vouchieIndex < goal.vouchies.length, "Index out of bounds");
        require(goal.vouchies[_vouchieIndex] == msg.sender, "Not vouchie member");
        require(!goal.hasVoted[msg.sender], "Already voted");

        goal.hasVoted[msg.sender] = true;
        if (_isValid) {
            goal.votesValid++;
        } else {
            goal.votesInvalid++;
        }

        emit VoteCast(_goalId, msg.sender, _isValid);
        
        // Auto-resolve if everyone voted
        if (goal.votesValid + goal.votesInvalid == goal.vouchies.length) {
            _resolve(_goalId);
        }
    }
    
    function resolve(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(!goal.resolved, "Already resolved");
        require(block.timestamp > goal.deadline, "Cannot force resolve before deadline");
        
        _resolve(_goalId);
    }

    function _resolve(uint256 _goalId) internal {
        Goal storage goal = goals[_goalId];
        if (goal.resolved) return;

        if (goal.votesInvalid > goal.votesValid) {
            goal.successful = false;
        } else {
            goal.successful = true;
        }

        // Strategy 1: Lazy Tax (Take cut on failure)
        if (!goal.successful && lazyTaxBps > 0 && goal.stakeAmount > 0) {
            uint256 fee = (goal.stakeAmount * lazyTaxBps) / 10000;
            if (fee > 0) {
                goal.stakeAmount -= fee;
                token.safeTransfer(treasury, fee);
            }
        }

        goal.resolved = true;
        emit GoalResolved(_goalId, goal.successful);
    }

    // Strategy 2: Status Tax (Pay to Mint Badge)
    function claimBadge(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(goal.resolved && goal.successful, "Goal not successful");
        require(msg.sender == goal.creator, "Only creator");
        require(address(badgeContract) != address(0), "Badge not configured");
        
        token.safeTransferFrom(msg.sender, treasury, badgeFee);
        
        uint256 tokenId = badgeContract.mint(msg.sender);
        emit BadgeClaimed(_goalId, msg.sender, tokenId);
    }

    function claim(uint256 _goalId, uint256 _vouchieIndex) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(goal.resolved, "Not resolved");
        
        if (goal.successful) {
            require(msg.sender == goal.creator, "Only creator can claim success");
            require(goal.stakeAmount > 0, "Nothing to claim");
            
            uint256 amount = goal.stakeAmount;
            goal.stakeAmount = 0; 
            token.safeTransfer(msg.sender, amount);
            emit FundsClaimed(_goalId, msg.sender, amount);
        } else {
            // Failure: Vouchies split the pot (Post-Tax)
            require(_vouchieIndex < goal.vouchies.length, "Index out of bounds");
            require(goal.vouchies[_vouchieIndex] == msg.sender, "Not vouchie member");
            require(!vouchiesClaimed[_goalId][msg.sender], "Already claimed");
            
            uint256 vouchieSize = goal.vouchies.length;
            uint256 share = goal.stakeAmount / vouchieSize;
            
            if (_vouchieIndex == 0) {
                uint256 dust = goal.stakeAmount % vouchieSize;
                share += dust;
            }
            
            vouchiesClaimed[_goalId][msg.sender] = true;
            token.safeTransfer(msg.sender, share);
            emit FundsClaimed(_goalId, msg.sender, share);
        }
    }
    
    function getVouchies(uint256 _goalId) external view returns (address[] memory) {
        return goals[_goalId].vouchies;
    }
}
