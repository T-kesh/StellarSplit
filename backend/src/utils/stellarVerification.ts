import axios from "axios";

interface HorizonBalance {
  asset_code?: string;
  asset_type: string;
  balance: string;
}

interface HorizonAccount {
  balances: HorizonBalance[];
}

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export async function verifyBalance(
  accountId: string,
  asset: string,
  expected: number,
): Promise<boolean> {
  const { data } = await axios.get<HorizonAccount>(
    `${HORIZON_URL}/accounts/${accountId}`,
  );
  const balance = data.balances.find((entry) =>
    asset === "XLM"
      ? entry.asset_type === "native"
      : entry.asset_code === asset,
  );

  return balance ? Number(balance.balance) >= expected : false;
}
