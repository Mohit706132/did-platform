export type NetworkConfig = {
  chainId: number;
  name: string;
  didRegistryAddress: string;
};

export const NETWORKS: NetworkConfig[] = [
  {
    chainId: 31337,
    name: "Hardhat Localhost",
    didRegistryAddress: "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
  },
  {
    chainId: 11155111,
    name: "Sepolia Testnet",
    didRegistryAddress: "0xYourSepoliaRegistryAddressHere"
  }
  // add more if needed
];

export function getConfigForChain(chainId: number): NetworkConfig | undefined {
  return NETWORKS.find((n) => n.chainId === chainId);
}
