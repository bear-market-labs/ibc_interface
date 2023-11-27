import React from 'react';
import * as d3 from 'd3';
import * as _ from "lodash";
import { useEffect, useState, useRef } from 'react';
import { curveUtilization } from '../../config/constants';

interface ICurveParam {
    parameterK: number;
    parameterM: number;
}

export interface IChartParam {
    currentSupply: number;
    curveParameter: ICurveParam;
    // targetSupply?: number | null;
    // newCurveParam?: ICurveParam | null;
    targetSupplyChange?: number | null;
    targetLiquidityChange?: number | null;
}
interface IProps {
    chartParam: IChartParam
}

interface IChartState {
    xDomain: number[];
    yDomain: number[];
    supplyRange: number[];
    chart?: d3.Selection<SVGGElement, unknown, null, undefined>;
    xScale: d3.ScaleLinear<number, number, never>;
    yScale: d3.ScaleLinear<number, number, never>;
    maxM: number;
    minM: number;
}

export default function BondingCurveChart(props: IProps) {

    const defaultCurveParam = {
        currentSupply: 1,
        curveParameter: {
          parameterK: 0.5,
          parameterM: 1
        },
        // targetSupplyChange: 4,
        // targetLiquidityChange: -0.9
    }
    const chartRef = useRef<SVGSVGElement | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [initialized, setInitialized] = useState<Boolean>(false);
    const [chartState, setChartState] = useState<IChartState | null>(null);
    const [chartParam, setChartParam] = useState<IChartParam>(defaultCurveParam);
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    let innerWidth = 0;
    let innerHeight = 0;
    let width = 0;
    let height = 0;

    const MAX_SUPPLY_FACTOR = 3;
    const MIN_SUPPLY_FACTOE = 0.2;
    const GRID_LINE_COUNT = 7;

    useEffect(() => {

        if (props && props.chartParam && props.chartParam.currentSupply) {
            let forceRefresh = false, refreshCurve = false, refreshArea = false, refreshNewCurve = false;
            if(chartParam && initialized){
                if(_.isEqual(chartParam, props.chartParam)){
                    return;
                }
    
                refreshArea = chartParam.targetSupplyChange !== props.chartParam.targetSupplyChange;
    
                refreshNewCurve = chartParam.targetLiquidityChange !== props.chartParam.targetLiquidityChange;
            }else{
                forceRefresh = true;
            }

            setChartParam(props.chartParam);

            const curChartParam = props.chartParam;
            const previousSize = {
                width: 0,
                height: 0
            }
            const resizeObserver = new ResizeObserver(entries => {                
                if(entries[0].contentRect.width !== previousSize.width || entries[0].contentRect.height !== previousSize.height){
                    previousSize.width = entries[0].contentRect.width;
                    previousSize.height = entries[0].contentRect.height;
                    if (curChartParam && curChartParam.currentSupply) {
                        buildGraph(curChartParam, true);
                    }
                }
            });           
    
            if (chartContainerRef.current) {
                resizeObserver.unobserve(chartContainerRef.current)
                resizeObserver.observe(chartContainerRef.current);
            }

            buildGraph(props.chartParam, forceRefresh, refreshCurve, refreshArea, refreshNewCurve);
        }


    }, [props, props.chartParam]);

    function getRectRange() {
        width = chartRef.current?.parentElement?.clientWidth || 400;
        height = chartRef.current?.parentElement?.clientHeight || 300;
        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;
    }

    function updateChartData(curChartParam: IChartParam) {

        let currentSupply = curChartParam.currentSupply;

        let xDomain = [0, currentSupply * 3];
        let yDomain = [0, 1000];

        // Need to draw more points when supply is quite small
        let beginSupply = 0;
        let endSupply = xDomain[1] * 0.005;
        let dataRange = d3.range(beginSupply, endSupply, endSupply / 100);
        dataRange = dataRange.slice(1);
        beginSupply = endSupply;
        endSupply = xDomain[1] * 0.1;
        dataRange = dataRange.concat(d3.range(beginSupply, endSupply, (endSupply - beginSupply) / 100));
        beginSupply = endSupply;
        endSupply = xDomain[1];
        dataRange = dataRange.concat(d3.range(beginSupply, endSupply, (endSupply - beginSupply) / 100));


        const currentPrice = curChartParam.curveParameter.parameterM / (currentSupply ** curChartParam.curveParameter.parameterK);


        let maxY = currentPrice * MAX_SUPPLY_FACTOR;
        const minY = currentPrice * MIN_SUPPLY_FACTOE;


        yDomain[1] = maxY;

        let beginIndex = _.findIndex(dataRange, supply => {
            return (curChartParam.curveParameter.parameterM / (supply ** curChartParam.curveParameter.parameterK)) <= maxY;
        });
        if(beginIndex < 0){
            beginIndex = 0;
        }
        let endIndex = _.findIndex(dataRange, supply => {
            return (curChartParam.curveParameter.parameterM / (supply ** curChartParam.curveParameter.parameterK)) <= minY;
        });
        if(endIndex < 0){
            endIndex = dataRange.length;
        }

        dataRange = _.slice(dataRange, beginIndex, endIndex);
        xDomain[0] = dataRange[0];
        xDomain[1] = dataRange[dataRange.length - 1];
        yDomain[1] = (curChartParam.curveParameter.parameterM / ((dataRange[0]) ** curChartParam.curveParameter.parameterK)) * 1.05;
        yDomain[0] = (curChartParam.curveParameter.parameterM / ((dataRange[dataRange.length -1]) ** curChartParam.curveParameter.parameterK)) * 0.6;

        let currentY = curChartParam.curveParameter.parameterM / (curChartParam.currentSupply ** curChartParam.curveParameter.parameterK);
        let maxM = currentY * ((dataRange[dataRange.length -1]) ** curChartParam.curveParameter.parameterK);
        let minM = (dataRange[0] ** curChartParam.curveParameter.parameterK) * currentPrice;

        const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

        let curChartState: IChartState = {
            xDomain: xDomain,
            yDomain: yDomain,
            supplyRange: dataRange,
            xScale: xScale,
            yScale: yScale,
            chart: chartState?.chart,
            maxM: maxM,
            minM: minM, // proper number to avoid y value lower than y domain bound
        }

        setChartState(curChartState);
        return curChartState;
    }

    function drawChartBase(curChartState: IChartState) {
        if (curChartState) {
            d3
                .select(chartRef.current)
                .select('svg')
                .remove();

            // SVG element
            const svg = d3
                .select(chartRef.current)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            // Chart group
            const chart = svg
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);


            curChartState.chart = chart;
            setChartState(curChartState);


            const numGridLines = GRID_LINE_COUNT;
            let xGridValues = d3.range(curChartState.yDomain[0], curChartState.yDomain[1], (curChartState.yDomain[1] - curChartState.yDomain[0])/ numGridLines);
            xGridValues.push(curChartState.yDomain[1]);
            const xGrid = d3
                .axisLeft(curChartState.yScale)
                .tickValues(xGridValues)
                .tickSize(-innerWidth)
                .tickFormat(null);

            chart.append('g').attr('class', 'grid').call(xGrid);

            // Remove ticks and default vertical grid line
            chart.selectAll('.domain').remove();
            chart.selectAll('.grid text').remove();
        }
    }
    function buildGraph(curChartParam: IChartParam, forceRefresh: boolean, refreshCurve = false, refreshArea = false, refreshNewCurve = false) {
        if(curChartParam){
            if (!initialized || forceRefresh || !chartState || !chartState.chart) {
                getRectRange();
                
                let curChartState = updateChartData(curChartParam);
                drawChartBase(curChartState);
                drawBondingCurve(curChartParam, curChartState, true, true, true);
                setInitialized(true);
            } else {
                getRectRange();
                let curChartState = chartState;

                curChartState = updateChartData(curChartParam);
                refreshCurve = true;
                refreshArea = true;
                refreshNewCurve = true;

    
                if (refreshCurve) {
                    removeDot('.dot-target');
                    removeLine('.line');
                }
    
                if (refreshArea) {
                    removeLiquidityArea();
                }
    
                if (refreshNewCurve) {
                    removeDot('.dot-from');
                    removeDot('.dot-target');
                    removeLine('.target-line');
                }
    
                drawBondingCurve(curChartParam, curChartState, refreshCurve, refreshArea, refreshNewCurve);
            }
        }        
    }

    function getProperParameter(chartState: IChartState, curChartParam: IChartParam){
        //display a smooth curve "shift", with bounds 
        let k = 1 - curveUtilization;
        let liquidityChange = curChartParam.targetLiquidityChange ?? 0;
        let m = Math.log(Math.E + liquidityChange);
        // limit the range of m to make the curve show properly with the old curve
        if(liquidityChange  > 0){
            if(m < 1.05 ){
                m = 1.05;
            }
        }else{
            if(m > 0.95 ){
                m = 0.95;
            }
        }

        m = curChartParam.curveParameter.parameterM * m;
        if(m > chartState.maxM){ 
            m = chartState.maxM;
        }else if(m < chartState.minM){
            m = chartState.minM;
        }
        
        let currentPrice = curChartParam.curveParameter.parameterM / (curChartParam.currentSupply ** curChartParam.curveParameter.parameterK);
        let newSupply = (m / currentPrice) ** (1/k);

        return {
            currentSupply: newSupply,
            curveParameter: {
                parameterK: k,
                parameterM: m,
            }
        }      
    }
    function drawBondingCurve(curChartParam: IChartParam, curChartState: IChartState, refreshCurve: boolean, refreshArea: boolean, refreshNewCurve: boolean) {
        let currentCurvePainted = false, liquidityAreaPainted = false, newCurvePainted = false;
        if(curChartParam){
            if (refreshCurve) {
                drawCurve(curChartState, curChartParam.curveParameter, 'line');
                currentCurvePainted = true;
                
            }
    
            if (curChartParam.targetLiquidityChange && refreshNewCurve) {
                let newChartParam = getProperParameter(curChartState, curChartParam);                
                drawCurve(curChartState, newChartParam.curveParameter, 'target-line');
                drawDot(curChartState, newChartParam.curveParameter, newChartParam.currentSupply, 'dot-target');
                newCurvePainted = true;                
            }
    
            if(refreshArea){
                if(curChartParam.targetSupplyChange){
                    drawLiquidityArea(curChartParam, curChartState);
                    liquidityAreaPainted = true;
                }
            }

            if(!liquidityAreaPainted){
                drawDot(curChartState, curChartParam.curveParameter, curChartParam.currentSupply, 'dot-from');
            }
        }
    }

    function drawLiquidityArea(curChartParam: IChartParam, curChartState: IChartState) {
        const maxChangePercent = (curChartState.xDomain[1] - curChartParam.currentSupply) / curChartParam.currentSupply;
        const minChangePercent = -(curChartParam.currentSupply - curChartState.xDomain[0]) / curChartParam.currentSupply;
        if (curChartState && curChartState.chart && curChartParam && curChartParam.targetSupplyChange) {
            if(curChartParam.targetSupplyChange > 0){
                if(curChartParam.targetSupplyChange < 0.1){
                    curChartParam.targetSupplyChange = 0.1;
                }else if(curChartParam.targetSupplyChange > maxChangePercent){
                    curChartParam.targetSupplyChange = maxChangePercent;
                }                
            }

            if(curChartParam.targetSupplyChange < 0){
                if(curChartParam.targetSupplyChange > -0.1){
                    curChartParam.targetSupplyChange = -0.1;
                }else if(curChartParam.targetSupplyChange < minChangePercent){
                    curChartParam.targetSupplyChange = minChangePercent;
                }                
            }

            let targetSupply = curChartParam.currentSupply * (1 + curChartParam.targetSupplyChange);
            const supplyRange = curChartState?.supplyRange;
            let minSupply = 0, maxSupply = 0;
            if (curChartParam.currentSupply < targetSupply) {
                minSupply = curChartParam.currentSupply;
                maxSupply = targetSupply;
            } else {
                minSupply = targetSupply;
                maxSupply = curChartParam.currentSupply;
            }

            let beginIndex = _.findIndex(supplyRange, item => {
                return item >= minSupply;
            });

            let endIndex = _.findIndex(supplyRange, item => {
                return item >= maxSupply;
            });

            if (beginIndex < 0) {
                beginIndex = 0;
            }

            if (endIndex < 0) {
                endIndex = supplyRange.length;
            }

            let areaDataRange = _.slice(supplyRange, beginIndex, endIndex);
            areaDataRange.splice(0, 0, minSupply);
            areaDataRange.push(maxSupply);

            drawArea(curChartState, curChartParam, areaDataRange);
            drawDot(curChartState, curChartParam.curveParameter, curChartParam.currentSupply, 'dot-from');
            drawDot(curChartState, curChartParam.curveParameter, targetSupply, 'dot-target');            
             
        }
       
    }

    function drawDot(curChartState: IChartState, param: ICurveParam, supply: number, className: string) {

        if (curChartState && curChartState.chart) {
            const chart = curChartState?.chart;
            const xScale = curChartState?.xScale;
            const yScale = curChartState?.yScale;

            const parameterK = param.parameterK;
            const parameterM = param.parameterM;


            const y = parameterM / (supply ** parameterK);

            const posX = xScale(supply);
            const posY = yScale(y);

            chart
                .append('circle')
                .attr('cx', posX)
                .attr('cy', posY)
                .attr('r', 5)
                .attr('class', className);
        }
    }

    function drawCurve(curChartState: IChartState, param: ICurveParam, className: string) {

        if (curChartState && curChartState.chart) {
            const chart = curChartState?.chart;
            const xScale = curChartState?.xScale;
            const yScale = curChartState?.yScale;
            const yDomain = curChartState.yDomain;
            const supplyRange = curChartState?.supplyRange;

            const parameterK = param.parameterK;
            const parameterM = param.parameterM;

            // Data
            const data = supplyRange.map((d) => ({
                x: d,
                y: parameterM / (d ** parameterK)
            }));

            _.remove(data, item =>{
                return item.y > yDomain[1] || item.y < yDomain[0];
            })

            // Line generator
            const line = d3
                .line<{ x: number; y: number }>()
                .x((d) => xScale(d.x))
                .y((d) => yScale(d.y));
            // Line
            chart
                .append('path')
                .datum(data)
                .attr('class', className)
                .attr('d', line);
        }
    }

    function removeLiquidityArea() {
        removeArea();
        removeDot('.dot-target');
        removeDot('.dot-from');
    }

    function removeArea() {

        if (chartState && chartState.chart) {
            chartState.chart.selectAll(".area").remove();
        }
    }

    function removeLine(className: string) {
        if (chartState && chartState.chart) {
            chartState.chart.selectAll(className).remove();
        }
    }

    function removeDot(className: string) {
        if (chartState && chartState.chart) {
            chartState.chart.selectAll(className).remove();
        }
    }

    function handleMouseOver(event: any) {
        if (chartState && chartState.chart) {
            const chart = chartState?.chart;
            const xScale = chartState?.xScale;

            const [x, y] = d3.pointer(event);
            const value = xScale.invert(x).toFixed(2);

            const tooltipGroup = chart.append('g')
                .attr('class', 'tooltip-group')
                .style('pointer-events', 'none');

            tooltipGroup.append('rect')
                .attr('class', 'tooltip-bg')
                .attr('x', x - 30)
                .attr('y', y - 60)
                .attr('width', 100)
                .attr('height', 20)

            // TODO: What to show on tooltip?
            // tooltipGroup.append('text')
            //     .attr('class', 'tooltip-text')
            //     .attr('x', x - 25)
            //     .attr('y', y - 45)
            //     .attr('text-anchor', 'left')
            //     .style('font-size', '10px')
            //     .style('white-space', 'pre')
            //     .text(`Supply   : ${param.currentSupply} -> ${param.targetSupply}`);
            // tooltipGroup.append('text')
            //     .attr('class', 'tooltip-text')
            //     .attr('x', x - 25)
            //     .attr('y', y - 30)
            //     .attr('text-anchor', 'left')
            //     .style('font-size', '10px')
            //     .style('white-space', 'pre')
            //     .text("Reserve : 178.56 -> 192.39");
        }
    }

    function handleMouseOut() {
        if (chartState && chartState.chart) {
            const chart = chartState?.chart;
            chart.select('.tooltip-group').remove();
        }
    }

    function drawArea(curChartState: IChartState, param: IChartParam, supplyRange: number[]) {

        if (curChartState && curChartState.chart) {
            const chart = curChartState?.chart;
            const xScale = curChartState?.xScale;
            const yScale = curChartState?.yScale;


            const parameterK = param.curveParameter.parameterK;
            const parameterM = param.curveParameter.parameterM;

            // Data
            const data = supplyRange.map((d) => ({
                x: d,
                y: parameterM / (d ** parameterK)
            }));

            const y0 = yScale(curChartState.yDomain[0]);
            // Scales
            const area = d3.area<{ x: number; y: number }>()
                .x(d => xScale(d.x))
                .y0(y0)
                .y1(d => yScale(d.y));

            chart.append('path')
                .datum(data)
                .attr('d', area)
                .attr('class', 'area')
            // .on('mouseover', handleMouseOver)
            // .on('mouseout', handleMouseOut);
        }
    }




    return (<div className="parent"><div className="svg" ref={chartContainerRef}>
        <div className="text-price">PRICE</div>
        <div className="text-issuance">ISSUANCE</div>
        <svg className="chart-container" ref={chartRef} ></svg>
        <style>{`
        .parent{
            width: 100%;
            height: 100%;
            text-align: left;
        }
        .svg{
            position: relative;
            display: inline-block;
            width: 100%;
            height: 100%;
        }
        .chart-container {
            width: 100%;
            height: 100%;
            background-color: #1C1931;
        }

        .line {
            fill: none;
            stroke: #2087BA;
            stroke-width: 2px;
        }

        .target-line{
            fill: none;
            stroke: rgba(32, 135, 186, 0.40);
            stroke-width: 2px; 
        }

        .grid  line{    
            stroke: rgba(255, 255, 255, 0.30);
        }

        .area{
            fill: rgba(32, 135, 186, 0.60);
        }

        .dot-from{
            fill: #2087BA;
        }
        .dot-target{
            fill: #DDE2EA;
            stroke-width: 2px;
            stroke: #2087BA;
        }

        .text-issuance{
            color: #DDE2EA;
            text-align: right;
            text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
            font-size: 14px;
            font-style: normal;
            font-weight: 500;
            line-height: 25px;
            letter-spacing: 5.6px;
            position: absolute;
            right: 13px;
            bottom: 2px;
        }

        .text-price{
            position: absolute;
            top: 20px;
            left: 5px;
            color: #DDE2EA;
            text-align: right;
            text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
            font-size: 14px;
            font-style: normal;
            font-weight: 500;
            line-height: 25px;
            letter-spacing: 5.6px;
            writing-mode: vertical-rl;
            text-orientation: upright;
        }
        .tooltip-bg{
            fill: #DDE2EA;
        }
        .tooltip-text{
            color: #DDE2EA;
            // text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
            font-size: 16px;
            font-style: normal;
            font-weight: 500;
            line-height: 25px; /* 156.25% */
            letter-spacing: -0.32px;
        }
      `}</style>
    </div></div>);

}

// export default BondingCurveChart;
