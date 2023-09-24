import React from 'react';
import * as d3 from 'd3';
import * as _ from "lodash";
import { useCallback, useEffect, useState, useRef } from 'react';

interface ICurveParam {
    parameterK: number;
    parameterM: number;
}

export interface IChartParam {
    currentSupply: number;
    curveParameter: ICurveParam;
    targetSupply?: number | null;
    newCurveParam?: ICurveParam | null;
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
}

export default function BondingCurveChart(props: IProps) {
    const chartRef = useRef<SVGSVGElement | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [initialized, setInitialized] = useState<Boolean>(false);
    const [chartState, setChartState] = useState<IChartState | null>(null);
    const [chartParam, setChartParam] = useState<IChartParam>({
        currentSupply: 1,
        curveParameter: {
          parameterK: 0.5,
          parameterM: 1
        },
    });
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    let innerWidth = 0;
    let innerHeight = 0;
    let width = 0;
    let height = 0;

    const MAX_SUPPLY_FACTOR = 10;
    const MIN_SUPPLY_FACTOE = 0.2;
    const GRID_LINE_COUNT = 7;

    useEffect(() => {

        console.log('<-------parameter change:');
        console.log(props);

        if (props && props.chartParam && props.chartParam.currentSupply) {
            console.log(props);
            let forceRefresh = false, refreshCurve = false, refreshArea = false, refreshNewCurve = false;
            if(chartParam && initialized){
                if(_.isEqual(chartParam, props.chartParam)){
                    return;
                }
                if (chartParam.currentSupply != props.chartParam.currentSupply ||
                    !_.isEqual(chartParam.curveParameter, props.chartParam.curveParameter)) {
                    refreshCurve = true;
                }
    
                refreshArea = chartParam.targetSupply != props.chartParam.targetSupply;
    
                refreshNewCurve = !_.isEqual(chartParam.newCurveParam, props.chartParam.newCurveParam);
            }else{
                forceRefresh = true;
            }

            setChartParam(props.chartParam);

            const curChartParam = _.cloneDeep(props.chartParam);
            const resizeObserver = new ResizeObserver(entries => {
                if (curChartParam && curChartParam.currentSupply) {
                    buildGraph(curChartParam, true);
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
        if (curChartParam.targetSupply && curChartParam.targetSupply > currentSupply) {
            currentSupply = curChartParam.targetSupply
        }

        let xDomain = [0, currentSupply * 10];
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


        const currentPrice = curChartParam.curveParameter.parameterM / (currentSupply ** curChartParam.curveParameter.parameterK)
        let maxY = currentPrice * MAX_SUPPLY_FACTOR;
        const minY = currentPrice * MIN_SUPPLY_FACTOE;

        if(curChartParam.targetSupply && curChartParam.targetSupply < currentSupply){
            const targetPrice = curChartParam.curveParameter.parameterM / (curChartParam.targetSupply ** curChartParam.curveParameter.parameterK);
            if(targetPrice > maxY){
                maxY = targetPrice;
            }
        }

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
        xDomain[1] = dataRange[dataRange.length - 1];

        const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

        let curChartState: IChartState = {
            xDomain: xDomain,
            yDomain: yDomain,
            supplyRange: dataRange,
            xScale: xScale,
            yScale: yScale,
            chart: chartState?.chart,
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
            let xGridValues = d3.range(curChartState.yDomain[0], curChartState.yDomain[1], curChartState.yDomain[1] / numGridLines);
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
                let supplyRange = chartState.supplyRange;
                let curChartState = chartState;
                if (!inDataRange(supplyRange, curChartParam.currentSupply) ||
                    (curChartParam.targetSupply && !inDataRange(supplyRange, curChartParam.targetSupply))) {
                    curChartState = updateChartData(curChartParam);
                    refreshCurve = true;
                    refreshArea = true;
                    refreshNewCurve = true;
                }
    
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

    function drawBondingCurve(curChartParam: IChartParam, curChartState: IChartState, refreshCurve: boolean, refreshArea: boolean, refreshNewCurve: boolean) {
        let currentCurvePainted = false, liquidityAreaPainted = false, newCurvePainted = false;
        if(curChartParam){
            if (refreshCurve) {
                drawCurve(curChartState, curChartParam.curveParameter, 'line');
                currentCurvePainted = true;
                
            }
    
            if (curChartParam.newCurveParam && refreshNewCurve) {
                drawCurve(curChartState, curChartParam.newCurveParam, 'target-line');
                newCurvePainted = true;
                
            }
    
            if(refreshArea){
                if (curChartParam.targetSupply) {
                    drawLiquidityArea(curChartParam, curChartState);
                    liquidityAreaPainted = true;
                } else {
                    // drawDot(curChartState, curChartParam.curveParameter, curChartParam.currentSupply, 'dot-target');
                }
            }

            if(!liquidityAreaPainted){
                if(newCurvePainted){
                    drawDot(curChartState, curChartParam.curveParameter, curChartParam.currentSupply, 'dot-from');
                }else if(currentCurvePainted){
                    drawDot(curChartState, curChartParam.curveParameter, curChartParam.currentSupply, 'dot-target');
                }
            }
        }
    }

    function inDataRange(dataRange: number[], data: number) {
        return data >= dataRange[0] && data <= dataRange[dataRange.length - 1];
    }

    function drawLiquidityArea(curChartParam: IChartParam, curChartState: IChartState) {

        if (curChartState && curChartState.chart && curChartParam && curChartParam.targetSupply) {
            const supplyRange = curChartState?.supplyRange;
            let minSupply = 0, maxSupply = 0;
            if (curChartParam.currentSupply < curChartParam.targetSupply) {
                minSupply = curChartParam.currentSupply;
                maxSupply = curChartParam.targetSupply;
            } else {
                minSupply = curChartParam.targetSupply;
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
            drawDot(curChartState, curChartParam.curveParameter, curChartParam.targetSupply, 'dot-target');            
        }
    }

    function drawDot(curChartState: IChartState, param: ICurveParam, supply: number, className: string) {

        if (curChartState && curChartState.chart) {
            const chart = curChartState?.chart;
            const xScale = curChartState?.xScale;
            const yScale = curChartState?.yScale;
            const supplyRange = curChartState?.supplyRange;

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
                return item.y > yDomain[1];
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

            // Scales
            const area = d3.area<{ x: number; y: number }>()
                .x(d => xScale(d.x))
                .y0(yScale(0))
                .y1(d => yScale(d.y));

            chart.append('path')
                .datum(data)
                .attr('d', area)
                .attr('class', 'area')
            // .on('mouseover', handleMouseOver)
            // .on('mouseout', handleMouseOut);
        }
    }




    return (<div className="svg" ref={chartContainerRef}>
        <div className="text-price">PRICE</div>
        <div className="text-issuance">ISSUANCE</div>
        <svg className="chart-container" ref={chartRef} ></svg>
        <style>{`
        .svg{
            position: relative;
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
    </div>);

}

// export default BondingCurveChart;
