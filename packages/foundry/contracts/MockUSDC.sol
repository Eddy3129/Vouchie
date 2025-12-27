// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice A mock ERC20 token for testing. Uses 18 decimals for compatibility with parseEther.
 * @dev In production, replace with real USDC (6 decimals) and adjust fee constants in VouchieVault.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Mint tokens to any address. Open for testing purposes.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenience function to mint tokens to caller
     * @param amount The amount of tokens to mint
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
