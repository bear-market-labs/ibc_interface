import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { Button, Input, Link, Stack } from '@chakra-ui/react'
import { contracts } from '../../config/contracts'
import { BiLinkExternal } from 'react-icons/bi'
import { isAbleToSendTransaction } from '../../config/validation'
import { colors } from '../../config/style'
import { ibcImageUrl } from '../../config/constants'

type addProps = {
  tokenDecimals: any;
  tokenAddress: any;
  tokenSymbol: any;
}

export default function AddIbc(props: addProps) {
  const [{ wallet, }] = useConnectWallet()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const tokenImage = ibcImageUrl;
  const {tokenDecimals, tokenAddress, tokenSymbol} = props;

  const sendTransaction = useCallback(async () => {

    if (!wallet || !wallet?.provider){
      return
    }
  
    try {
      await wallet?.provider.request({
        method: 'wallet_watchAsset',
        params: {
          // @ts-ignore ethers has wrong params type (Array<any>)
          "type": 'ERC20',
          options: {
            address: tokenAddress, // The address of the token.
            symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 characters.
            decimals: tokenDecimals, // The number of decimals in the token.
            image: tokenImage, // A string URL of the token logo.
          },
        },
      });
    
    } catch (error) {
      console.log(error);
    }
  }, [wallet, ibcContractAddress, tokenAddress, tokenDecimals, tokenSymbol, tokenImage]);

  return (
    <>
      {
        isAbleToSendTransaction(wallet, wallet?.provider, 69)&&(
          <Link onClick={sendTransaction} isExternal>
          <BiLinkExternal></BiLinkExternal>
          </Link>
        )
      }

      {
        !isAbleToSendTransaction(wallet, wallet?.provider, 69)&&(
          <BiLinkExternal color={colors.GRAYED_OUT_GRAY}></BiLinkExternal>
        )
      }

    </>
  )
}
