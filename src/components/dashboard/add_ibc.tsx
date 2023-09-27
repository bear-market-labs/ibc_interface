import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, BigNumber } from 'ethers'
import { Button, Input, Stack } from '@chakra-ui/react'
import { contracts } from '../../config/contracts'

type mintProps = {
  dashboardDataSet: any;
  parentSetters: any;
}

export default function AddIbc(props: mintProps) {
  const [{ wallet, }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet, } = props

  const tokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 
  const tokenAddress = "inverseTokenAddress" in dashboardDataSet ? dashboardDataSet.inverseTokenAddress : '';
  const tokenSymbol = "inverseTokenSymbol" in dashboardDataSet ? dashboardDataSet.inverseTokenSymbol : '';
  
  const tokenImage = 'http://placekitten.com/200/300';



  const sendTransaction = useCallback(async () => {

    if (!wallet){
      return
    }

    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }
  
    try {
      // 'wasAdded' is a boolean. Like any RPC method, an error can be thrown.
      const wasAdded = await wallet?.provider.request({
        method: 'wallet_watchAsset',
        params: {
          "type": 'ERC20',
          options: {
            address: tokenAddress, // The address of the token.
            symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 characters.
            decimals: tokenDecimals, // The number of decimals in the token.
            image: tokenImage, // A string URL of the token logo.
          },
        },
      });
    
      if (wasAdded) {
        console.log('Thanks for your interest!');
      } else {
        console.log('Your loss!');
      }
    } catch (error) {
      console.log(error);
    }
  }, [wallet, provider, ibcContractAddress]);

  return (
    <>
      <Stack direction="row">
        <Button onClick={sendTransaction}>Add IBC</Button>
      </Stack>
    </>
  )
}
