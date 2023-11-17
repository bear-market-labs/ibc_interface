import { curves } from '../../config/curves';
import * as _ from "lodash";

type CurveInfo = {
    curveAddress: string,
    reserveSymbol: string,
    reserveAddress: string,
    reserveDecimals: number,
    ibAsset: string,    
    ibAssetAddress: string,   
}

export type CurveMetadata = {
    curveAddress: string,
    reserveSymbol: string,
    reserveAddress: string,
    reserveDecimals: number,
    ibAsset: string,    
    ibAssetAddress: string, 
    verified: boolean,
    icon: string,
}

export class CurveManager {
    static setItem(key: string, value: any): void {
      localStorage.setItem(key, JSON.stringify(value));
    }
  
    static getItem<T>(key: string): T | null {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }

    static getCurveList(): CurveMetadata[] {
        const curveList =  CurveManager.getItem<CurveInfo[]>('inverse_bonding_curve_list')??[];   
        const curveInfoList = curveList.map(curve => ({
            ...curve,
            icon: 'ib_asset_logo.svg'
        }));

        const curvesWithPreload = _.unionBy(curves, curveInfoList, 'curveAddress');
        // use lodash to merge two array curveList and curves with unique key curveAddress

        return curvesWithPreload.map(curve => ({
            ...curve,   
            verified: curve.icon != '' && curve.icon !== "ib_asset_logo.svg"
        }));
    }

    static getCurve(curveAddress: string): CurveMetadata | undefined {
        const curveList =  CurveManager.getItem<CurveInfo[]>('inverse_bonding_curve_list')??[];   
        const curve = _.find(curveList, {curveAddress: curveAddress});
        if(curve){
            const curveInfo = {
                ...curve,
                icon: 'ib_asset_logo.svg',
                verified: false
            }
            const preloadCurve = _.find(curves, {curveAddress: curveAddress});
            if(preloadCurve){
                curveInfo.icon = preloadCurve.icon;
                curveInfo.verified = true;
            }
            return curveInfo;
        }

        return curve;
    }

    static updateCurveList(curveList: CurveMetadata[]) {
        const curveMetaDataList = _.map(curveList, (curve)=>{
            return _.omit(curve, ['icon', 'verified']); 
        })
        CurveManager.setItem('inverse_bonding_curve_list', curveMetaDataList);
    }

    static updateCurve(curve: CurveMetadata) {
        const curveList =  CurveManager.getItem<CurveInfo[]>('inverse_bonding_curve_list')??[];   
        const index = curveList.findIndex(c => c.curveAddress === curve.curveAddress);
        if(index >= 0){
            curveList[index] = _.omit(curve, ['icon', 'verified']);
        }else{
            curveList.push(_.omit(curve, ['icon', 'verified']));
        }
        
        
        CurveManager.setItem('inverse_bonding_curve_list', curveList); 
    }
  }