// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./VouchieBadge.sol";

/**
 * @title VouchieVault
 * @author Vouchie Protocol
 * @notice The core Social Accountability Protocol. Handles bonding, voting, and payouts.
 * @dev Supports two modes:
 * 1. Squad Mode: Friends verify outcome. Failure = Friends split the pot (minus tax).
 * 2. Solo Mode: Self-verification before deadline. Failure = Protocol takes 100%.
 */
contract VouchieVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    /// @notice The ERC20 token used for staking (e.g., USDC).
    IERC20 public immutable token;
    
    /// @notice The NFT contract for achievement badges.
    VouchieBadge public badgeContract;

    /// @notice Destination for protocol fees.
    address public treasury;

    // --- Configuration (Adjustable by Admin) ---
    
    /// @notice Fee taken from the pot if a Squad Goal fails (Basis Points: 500 = 5%).
    uint256 public lazyTaxBps = 1000; // Default: 10%
    
    /// @notice Cost to buy a "Streak Freeze" (Time Extension).
    uint256 public extensionFee = 5 ether; // Default: 5 USDC
    
    /// @notice How much time a Streak Freeze adds.
    uint256 public extensionDuration = 12 hours;
    
    /// @notice Cost to mint a success badge.
    uint256 public badgeFee = 2 ether; // Default: 2 USDC

    // --- Data Structures ---

    struct Goal {
        uint256 id;
        address creator;
        uint256 stakeAmount;
        uint256 deadline;
        string description;
        address[] vouchies;     // Empty array implies Solo Mode
        bool resolved;
        bool successful;
        uint256 votesValid;
        uint256 votesInvalid;
        mapping(address => bool) hasVoted;
    }

    /// @notice Counter for Goal IDs.
    uint256 public goalCount;
    
    /// @notice Main storage for all goals.
    mapping(uint256 => Goal) public goals;
    
    /// @notice Tracks if a specific vouchie has claimed their share of a failed goal.
    /// @dev Mapping: GoalID -> VouchieAddress -> ClaimedStatus
    mapping(uint256 => mapping(address => bool)) public vouchiesClaimed; 

    // --- Events ---

    event GoalCreated(uint256 indexed goalId, address indexed creator, uint256 stakeAmount, uint256 deadline, bool isSolo);
    event VoteCast(uint256 indexed goalId, address indexed voter, bool isValid);
    event GoalResolved(uint256 indexed goalId, bool successful, bool isSolo);
    event FundsClaimed(uint256 indexed goalId, address indexed claimant, uint256 amount);
    event GoalCanceled(uint256 indexed goalId, address indexed creator, uint256 refundAmount);
    event StreakFrozen(uint256 indexed goalId, uint256 newDeadline, uint256 feePaid);
    event GoalExtended(uint256 indexed goalId, uint256 newDeadline, uint256 addedStake);
    event BadgeClaimed(uint256 indexed goalId, address indexed creator, uint256 tokenId);
    event ConfigUpdated(address treasury, uint256 lazyTaxBps, uint256 extensionFee, uint256 badgeFee);

    // --- Constructor ---

    /**
     * @param _token Address of the staking token (e.g., USDC).
     */
    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        token = IERC20(_token);
        treasury = msg.sender;
    }

    // --- Admin Functions ---

    /**
     * @notice Updates protocol configuration.
     * @dev Does not affect existing goals, only new ones or future actions.
     */
    function setConfig(
        address _treasury, 
        uint256 _lazyTaxBps, 
        uint256 _extensionFee, 
        uint256 _badgeFee, 
        uint256 _extensionDuration
    ) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        require(_lazyTaxBps <= 10000, "Invalid BPS"); // Max 100%
        
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

    // --- Core Logic: Goal Lifecycle ---

    /**
     * @notice Creates a new accountability goal.
     * @param _amount Amount of tokens to lock.
     * @param _duration Duration in seconds until deadline.
     * @param _description Text description or IPFS hash of the goal.
     * @param _vouchies Array of friends to verify. If empty, enables Solo Mode.
     */
    function createGoal(
        uint256 _amount,
        uint256 _duration,
        string calldata _description,
        address[] calldata _vouchies
    ) external nonReentrant {
        require(_amount > 0, "Stake must be > 0");
        require(_duration > 0, "Duration must be > 0");

        // Anti-Gaming: Creator cannot be their own judge in Squad Mode
        for (uint256 i = 0; i < _vouchies.length; i++) {
            require(_vouchies[i] != msg.sender, "Creator cannot be in vouchies");
        }

        // Pull funds
        token.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 goalId = goalCount++;
        Goal storage newGoal = goals[goalId];
        newGoal.id = goalId;
        newGoal.creator = msg.sender;
        newGoal.stakeAmount = _amount;
        newGoal.deadline = block.timestamp + _duration;
        newGoal.description = _description;
        newGoal.vouchies = _vouchies;

        emit GoalCreated(goalId, msg.sender, _amount, newGoal.deadline, _vouchies.length == 0);
    }

    /**
     * @notice Allows creator to cancel and refund if voting hasn't started.
     * @dev Prevents accidental locks or typo errors.
     */
    function cancelGoal(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(!goal.resolved, "Already resolved");
        require(goal.votesValid == 0 && goal.votesInvalid == 0, "Cannot cancel: voting started");

        goal.resolved = true;
        
        uint256 refund = goal.stakeAmount;
        if (refund > 0) {
            goal.stakeAmount = 0;
            token.safeTransfer(msg.sender, refund);
        }
        
        emit GoalCanceled(_goalId, msg.sender, refund);
    }

    // --- Verification Logic ---

    /**
     * @notice SOLO MODE ONLY: Creator self-verifies completion before deadline.
     * @param _goalId The ID of the goal.
     */
    function verifySolo(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(goal.vouchies.length == 0, "Not a solo goal");
        require(!goal.resolved, "Already resolved");
        require(block.timestamp <= goal.deadline, "Deadline passed");

        // Success condition met
        goal.successful = true;
        goal.resolved = true;
        
        emit GoalResolved(_goalId, true, true);
    }

    /**
     * @notice SQUAD MODE ONLY: Vouchies cast their vote on the proof.
     * @param _goalId The ID of the goal.
     * @param _isValid True for "Approve", False for "Reject".
     * @param _vouchieIndex Optimizes gas by avoiding loop lookup.
     */
    function vote(uint256 _goalId, bool _isValid, uint256 _vouchieIndex) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(goal.vouchies.length > 0, "Cannot vote on solo goal");
        require(!goal.resolved, "Goal already resolved");
        
        // Validate Voter
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
        
        // Auto-resolve if 100% of squad has voted
        if (goal.votesValid + goal.votesInvalid == goal.vouchies.length) {
            _resolve(_goalId);
        }
    }

    // --- Settlement Logic ---

    /**
     * @notice Triggers final settlement if deadline has passed.
     * @dev Anyone can call this (Creator, Squad, or Keeper bots).
     */
    function resolve(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(!goal.resolved, "Already resolved");
        require(block.timestamp > goal.deadline, "Cannot force resolve before deadline");
        
        _resolve(_goalId);
    }

    /**
     * @dev Internal resolution logic. Handles Taxes and Success/Fail states.
     */
    function _resolve(uint256 _goalId) internal {
        Goal storage goal = goals[_goalId];
        if (goal.resolved) return;

        bool isSolo = goal.vouchies.length == 0;

        if (isSolo) {
            // SOLO MODE: If we are here, VerifySolo was NOT called in time.
            // Automatic Failure.
            goal.successful = false;
        } else {
            // SQUAD MODE: Majority Vote.
            // Tie (50/50) defaults to Success (Creator Friendly).
            if (goal.votesInvalid > goal.votesValid) {
                goal.successful = false;
            } else {
                goal.successful = true;
            }
        }

        // --- TAXATION LOGIC ---
        // Only applies if goal FAILED and there is money at stake.
        if (!goal.successful && goal.stakeAmount > 0) {
            if (isSolo) {
                // SOLO FAILURE: Protocol takes 100% (High Stakes)
                uint256 amount = goal.stakeAmount;
                goal.stakeAmount = 0; // Zero out before transfer
                token.safeTransfer(treasury, amount);
                // No funds left for anyone else.
            } else if (lazyTaxBps > 0) {
                // SQUAD FAILURE: Protocol takes x% Tax, Squad gets rest.
                uint256 fee = (goal.stakeAmount * lazyTaxBps) / 10000;
                if (fee > 0) {
                    goal.stakeAmount -= fee; // Reduce the pot
                    token.safeTransfer(treasury, fee);
                }
            }
        }

        goal.resolved = true;
        emit GoalResolved(_goalId, goal.successful, isSolo);
    }

    // --- Monetization Features ---

    /**
     * @notice Pay a fee to extend the deadline (Revenue Stream).
     */
    function streakFreeze(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(msg.sender == goal.creator, "Only creator");
        require(!goal.resolved, "Already resolved");

        // Collect Fee
        token.safeTransferFrom(msg.sender, treasury, extensionFee);
        
        // Apply Extension
        goal.deadline += extensionDuration;
        emit StreakFrozen(_goalId, goal.deadline, extensionFee);
    }

    /**
     * @notice Pay a fee to mint an NFT Badge for a successful goal.
     */
    function claimBadge(uint256 _goalId) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(goal.resolved && goal.successful, "Goal not successful");
        require(msg.sender == goal.creator, "Only creator");
        require(address(badgeContract) != address(0), "Badge not configured");
        
        // Collect Fee
        token.safeTransferFrom(msg.sender, treasury, badgeFee);
        
        // Mint NFT
        uint256 tokenId = badgeContract.mint(msg.sender);
        emit BadgeClaimed(_goalId, msg.sender, tokenId);
    }

    // --- Claiming Funds ---

    /**
     * @notice Claim payout after resolution.
     * @param _goalId The ID of the goal.
     * @param _vouchieIndex The index of the caller in the vouchies array (ignored for Creator).
     */
    function claim(uint256 _goalId, uint256 _vouchieIndex) external nonReentrant {
        Goal storage goal = goals[_goalId];
        require(goal.resolved, "Not resolved");
        require(goal.stakeAmount > 0, "Nothing to claim");
        
        if (goal.successful) {
            // SUCCESS: Creator gets 100% refund
            require(msg.sender == goal.creator, "Only creator can claim success");
            
            uint256 amount = goal.stakeAmount;
            goal.stakeAmount = 0; // Re-entrancy protection
            token.safeTransfer(msg.sender, amount);
            
            emit FundsClaimed(_goalId, msg.sender, amount);

        } else {
            // FAILURE: Squad splits the remaining pot
            // Note: Solo goals will have stakeAmount == 0 here (taken by treasury in resolve)
            
            require(goal.vouchies.length > 0, "Solo failure has no payout");
            require(_vouchieIndex < goal.vouchies.length, "Index out of bounds");
            require(goal.vouchies[_vouchieIndex] == msg.sender, "Not vouchie member");
            require(!vouchiesClaimed[_goalId][msg.sender], "Already claimed");
            
            uint256 vouchieSize = goal.vouchies.length;
            uint256 share = goal.stakeAmount / vouchieSize;
            
            // Handle Dust: Give remainder to the first squad member (index 0)
            // This prevents tiny amounts of wei getting stuck in contract.
            if (_vouchieIndex == 0) {
                uint256 dust = goal.stakeAmount % vouchieSize;
                share += dust;
            }
            
            vouchiesClaimed[_goalId][msg.sender] = true;
            token.safeTransfer(msg.sender, share);
            
            emit FundsClaimed(_goalId, msg.sender, share);
        }
    }
    
    // --- View Functions ---

    function getVouchies(uint256 _goalId) external view returns (address[] memory) {
        return goals[_goalId].vouchies;
    }
    
    function getGoalDetails(uint256 _goalId) external view returns (
        address creator, 
        uint256 stake, 
        uint256 deadline, 
        bool successful, 
        bool resolved,
        uint256 validVotes,
        uint256 invalidVotes
    ) {
        Goal storage g = goals[_goalId];
        return (g.creator, g.stakeAmount, g.deadline, g.successful, g.resolved, g.votesValid, g.votesInvalid);
    }
}