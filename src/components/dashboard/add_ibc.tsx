import { useCallback } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { Box, Image } from '@chakra-ui/react'
import { isAbleToSendTransaction } from '../../config/validation'
import { curves } from '../../config/curves'
import * as _ from "lodash";

type addProps = {
  tokenDecimals: any;
  tokenAddress: any;
  tokenSymbol: any;
}

export default function AddIbc(props: addProps) {
  const [{ wallet, }] = useConnectWallet()
  const {tokenDecimals, tokenAddress, tokenSymbol} = props;

  const curveInfo = _.find(curves, (curve) => curve.ibAssetAddress === tokenAddress)
  const ibcImage = curveInfo ? curveInfo.icon : 'unlisted_logo.png'
  const tokenImage = require('../../assets/' + ibcImage);

  const tokenImageStatic = window.origin + tokenImage;

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
            image: tokenImageStatic, // A string URL of the token logo.
          },
        },
      });
    
    } catch (error) {
      console.log(error);
    }
  }, [wallet, tokenAddress, tokenDecimals, tokenSymbol, tokenImage]);

  return (
    <>
      {
        isAbleToSendTransaction(wallet, wallet?.provider, 69)&&(
          <Box as='button' boxSize='32px'>
            <Image src={tokenImage} onClick={sendTransaction} />
          </Box>
          )
      }

      {
        !isAbleToSendTransaction(wallet, wallet?.provider, 69)&&(
          <Box boxSize='32px'>
            <Image src={tokenImage} />
          </Box>
        )
      }

    </>
  )
}
