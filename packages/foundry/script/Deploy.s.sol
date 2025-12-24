// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployVouchieVault } from "./DeployVouchieVault.s.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this script to deploy all contracts in the correct order
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Deploys all your contracts sequentially
        // Add new deployments here when needed

        DeployVouchieVault deployVouchieVault = new DeployVouchieVault();
        deployVouchieVault.run();
    }
}
