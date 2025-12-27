// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/VouchieVault.sol";
import "../contracts/VouchieBadge.sol";
import "../contracts/MockUSDC.sol";

/**
 * @notice Deploy script for VouchieVault contract (Vouchie)
 * @dev Deploys MockUSDC, VouchieBadge, and VouchieVault with proper linkages
 */
contract DeployVouchieVault is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address usdcAddress;
        
        if (block.chainid == 8453) {
            // Base Mainnet - Use real USDC
            usdcAddress = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
            console.log("Using Real USDC on Base:", usdcAddress);
        } else {
            // Local/Testnet - Deploy MockUSDC
            MockUSDC mockUSDC = new MockUSDC();
            usdcAddress = address(mockUSDC);
            console.log("MockUSDC deployed at:", usdcAddress);
            
            // Mint test tokens to deployer for testing (10,000 mUSDC)
            mockUSDC.mint(deployer, 10_000 * 10 ** 18);
            console.log("Minted 10,000 mUSDC to deployer:", deployer);
        }

        // Deploy Badge NFT
        VouchieBadge badge = new VouchieBadge();
        console.log("VouchieBadge deployed at:", address(badge));

        // Deploy VouchieVault with USDC address
        VouchieVault vouchieVault = new VouchieVault(usdcAddress);
        console.log("VouchieVault deployed at:", address(vouchieVault));

        // Setup Linkage between contracts
        vouchieVault.setBadgeContract(address(badge));
        badge.setVault(address(vouchieVault));

        // Configure fees for Base (6 decimals)
        if (block.chainid == 8453) {
            // Treasury, Tax (10%), Extension Fee (5 USDC), Badge Fee (2 USDC), Extension Duration (12h)
            vouchieVault.setConfig(deployer, 1000, 5 * 10**6, 2 * 10**6, 12 hours);
            console.log("Configured VouchieVault for Base (6 decimals)");
        }
    }
}