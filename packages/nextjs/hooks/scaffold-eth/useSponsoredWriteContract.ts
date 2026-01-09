"use client";

import { useState } from "react";
import { Abi, encodeFunctionData } from "viem";
import { useAccount, useSendCalls, useWaitForTransactionReceipt } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useSelectedNetwork } from "~~/hooks/scaffold-eth";
import { AllowedChainIds, notification } from "~~/utils/scaffold-eth";
import { ContractName } from "~~/utils/scaffold-eth/contract";

// CDP Paymaster endpoint from environment
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;

export interface UseSponsoredWriteContractConfig<TContractName extends ContractName> {
  contractName: TContractName;
  chainId?: AllowedChainIds;
}

/**
 * Hook for sending sponsored transactions using CDP Paymaster.
 * Uses wagmi's useSendCalls with paymasterService capability.
 *
 * Note: Only works with Smart Wallets (Coinbase Smart Wallet).
 * EOA wallets will fall back to regular (non-sponsored) transactions.
 */
export function useSponsoredWriteContract<TContractName extends ContractName>({
  contractName,
  chainId,
}: UseSponsoredWriteContractConfig<TContractName>) {
  const { chain: accountChain, address } = useAccount();
  const selectedNetwork = useSelectedNetwork(chainId);
  const [isMining, setIsMining] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();

  const { data: deployedContractData } = useDeployedContractInfo({
    contractName,
    chainId: selectedNetwork.id as AllowedChainIds,
  });

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  // useSendCalls for batched/sponsored transactions
  const { sendCallsAsync, isPending } = useSendCalls();

  /**
   * Send a sponsored transaction
   */
  const writeContractAsync = async <TFunctionName extends string>({
    functionName,
    args,
    value,
  }: {
    functionName: TFunctionName;
    args?: readonly unknown[];
    value?: bigint;
  }): Promise<string | undefined> => {
    if (!deployedContractData) {
      notification.error("Target Contract is not deployed, did you forget to run `yarn deploy`?");
      return undefined;
    }

    if (!address) {
      notification.error("Please connect your wallet");
      return undefined;
    }

    if (accountChain?.id !== selectedNetwork.id) {
      notification.error(`Wallet is connected to the wrong network. Please switch to ${selectedNetwork.name}`);
      return undefined;
    }

    if (!PAYMASTER_URL) {
      notification.error("Paymaster URL not configured. Add NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT to your .env");
      return undefined;
    }

    try {
      setIsMining(true);

      // Encode the function call
      const callData = encodeFunctionData({
        abi: deployedContractData.abi as Abi,
        functionName: functionName as string,
        args: (args ?? []) as readonly unknown[],
      });

      // Send with paymaster sponsorship
      const result = await sendCallsAsync({
        calls: [
          {
            to: deployedContractData.address,
            data: callData,
            value: value ?? 0n,
          },
        ],
        capabilities: {
          paymasterService: {
            url: PAYMASTER_URL,
          },
        },
      });

      // result is an object with id, extract the id as call identifier
      const callId = typeof result === "object" && result !== null && "id" in result ? result.id : String(result);
      console.log("Sponsored transaction sent:", callId);
      notification.success("Transaction sponsored and sent!");

      // Note: useSendCalls returns a call ID, not a tx hash directly
      setTxHash(callId);

      return callId;
    } catch (error: any) {
      console.error("Sponsored transaction error:", error);

      // Check for common paymaster errors
      if (error?.message?.includes("request denied")) {
        notification.error("Sponsorship denied - you may have hit your limit");
      } else if (error?.message?.includes("not supported")) {
        notification.error("Sponsorship not supported by this wallet. Use Coinbase Smart Wallet.");
      } else {
        notification.error(error?.shortMessage || error?.message || "Transaction failed");
      }

      throw error;
    } finally {
      setIsMining(false);
    }
  };

  return {
    writeContractAsync,
    isMining: isMining || isPending,
    isConfirming,
    isSuccess,
    txHash,
  };
}
