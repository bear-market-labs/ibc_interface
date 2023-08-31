import { useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from "ethers";
import type {
  TokenSymbol
} from '@web3-onboard/common'

interface Account {
  address: string,
  balance: Record<TokenSymbol, string> | null,
  ens: {name: string|undefined, avatar: string|undefined}
}

export default function ConnectWallet() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const [ethersProvider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => {
    if (wallet?.provider) {
      const { name, avatar } = wallet?.accounts[0].ens ?? {}
      setAccount({
        address: wallet.accounts[0].address,
        balance: wallet.accounts[0].balance,
        ens: { name, avatar: avatar?.url }
      })
    }
  }, [wallet])

  useEffect(() => {
    // If the wallet has a provider than the wallet is connected
    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }
  }, [wallet])

  if(wallet?.provider && account) {
    return (
        <div>
            {account.ens?.avatar ? (<img src={account.ens?.avatar} alt="ENS Avatar" />) : null}
          <div>{ account.ens?.name ? account.ens.name : account.address }</div>
          <div>Connected to {wallet.label}</div>
          <button onClick={() => { disconnect({ label: wallet.label }) }}>Disconnect</button>
        </div>
    )
  }

  return (
    <div>
      <button
        disabled={connecting}
        onClick={() => connect()}>
        Connect
      </button>
    </div>
  )
}
