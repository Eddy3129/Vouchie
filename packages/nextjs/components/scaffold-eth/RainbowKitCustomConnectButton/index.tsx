"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

/**
 * Custom Wagmi Connect Button (watch USDC balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button className="btn btn-primary btn-sm h-9 min-h-0" onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return <WrongNetworkDropdown />;
              }

              return (
                <ConnectedContent
                  address={account.address as Address}
                  displayName={account.displayName}
                  ensAvatar={account.ensAvatar}
                  blockExplorerAddressLink={blockExplorerAddressLink}
                  chainId={chain.id}
                />
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};

// Separate component to use hooks properly
const ConnectedContent = ({
  address,
  displayName,
  ensAvatar,
  blockExplorerAddressLink,
  chainId,
}: {
  address: Address;
  displayName: string;
  ensAvatar?: string;
  blockExplorerAddressLink?: string;
  chainId: number;
}) => {
  // Get USDC contract for the current chain
  const usdcContract = externalContracts[chainId as keyof typeof externalContracts]?.USDC;

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcContract?.address,
    abi: usdcContract?.abi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: !!usdcContract,
    },
  });

  const formattedBalance = usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0";
  const displayBalance = parseFloat(formattedBalance).toFixed(2);

  return (
    <>
      <div className="flex items-center gap-1.5 mr-2">
        <span className="text-sm font-semibold">${displayBalance}</span>
        <span className="text-xs text-stone-500">USDC</span>
      </div>
      <AddressInfoDropdown
        address={address}
        displayName={displayName}
        ensAvatar={ensAvatar}
        blockExplorerAddressLink={blockExplorerAddressLink}
      />
      <AddressQRCodeModal address={address} modalId="qrcode-modal" />
      <RevealBurnerPKModal />
    </>
  );
};
