import React from 'react';
import * as d3 from 'd3';
import * as _ from "lodash";
import { useCallback, useEffect, useState, useRef } from 'react';
import './bonding_curve_chart.css';

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
            if(chartParam){
                if (chartParam.currentSupply != props.chartParam.currentSupply ||
                    _.isEqual(chartParam.curveParameter, props.chartParam.curveParameter)) {
                    refreshCurve = true;
                }
    
                refreshArea = chartParam.targetSupply != props.chartParam.targetSupply;
    
                refreshNewCurve = !_.isEqual(chartParam.newCurveParam, props.chartParam.newCurveParam);
            }else{
                forceRefresh = true;
            }

            setChartParam(props.chartParam)

            buildGraph(forceRefresh, refreshCurve, refreshArea, refreshNewCurve);
        }

        const resizeObserver = new ResizeObserver(entries => {
            if (chartParam && chartParam.currentSupply) {
                buildGraph(true);
            }
        });

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }
    }, [props, props.chartParam.currentSupply, props.chartParam.targetSupply, props.chartParam.newCurveParam]);

    function getRectRange() {
        width = chartRef.current?.parentElement?.clientWidth || 400;
        height = chartRef.current?.parentElement?.clientHeight || 300;
        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;
    }

    function updateChartData() {
        if(chartParam){

        }
        let currentSupply = chartParam.currentSupply;
        if (chartParam.targetSupply && chartParam.targetSupply > currentSupply) {
            currentSupply = chartParam.targetSupply
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


        const currentPrice = chartParam.curveParameter.parameterM / (currentSupply ** chartParam.curveParameter.parameterK)
        const maxY = currentPrice * MAX_SUPPLY_FACTOR;
        const minY = currentPrice * MIN_SUPPLY_FACTOE;

        yDomain[1] = maxY;

        let beginIndex = _.findIndex(dataRange, supply => {
            return (chartParam.curveParameter.parameterM / (supply ** chartParam.curveParameter.parameterK)) <= maxY;
        });
        let endIndex = _.findIndex(dataRange, supply => {
            return (chartParam.curveParameter.parameterM / (supply ** chartParam.curveParameter.parameterK)) <= minY;
        });

        dataRange = _.slice(dataRange, beginIndex, endIndex);
        xDomain[1] = dataRange[dataRange.length - 1];

        const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

        let chartState: IChartState = {
            xDomain: xDomain,
            yDomain: yDomain,
            supplyRange: dataRange,
            xScale: xScale,
            yScale: yScale
        }

        setChartState(chartState);
    }

    function drawChartBase() {
        if (chartState) {
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


            chartState.chart = chart;
            setChartState(chartState);


            const numGridLines = GRID_LINE_COUNT;
            let xGridValues = d3.range(chartState.yDomain[0], chartState.yDomain[1], chartState.yDomain[1] / numGridLines);
            xGridValues.push(chartState.yDomain[1]);
            const xGrid = d3
                .axisLeft(chartState.yScale)
                .tickValues(xGridValues)
                .tickSize(-innerWidth)
                .tickFormat(null);

            chart.append('g').attr('class', 'grid').call(xGrid);

            // Remove ticks and default vertical grid line
            chart.selectAll('.domain').remove();
            chart.selectAll('.grid text').remove();

            chart
                .append('text')
                .attr('class', 'text-issuance')
                .attr('x', innerWidth)
                .attr('y', innerHeight + 20)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'baseline')
                .style('fill', 'white')
                .text('ISSUANCE');
        }
    }
    function buildGraph(forceRefresh: boolean, refreshCurve = false, refreshArea = false, refreshNewCurve = false) {
        if(chartParam){
            if (!initialized || forceRefresh || !chartState || !chartState.chart) {
                getRectRange();
                
                updateChartData();
                drawChartBase();
                drawBondingCurve(true, true, true);
                setInitialized(true);
            } else {
                let supplyRange = chartState.supplyRange;
                if (!inDataRange(supplyRange, chartParam.currentSupply) ||
                    (chartParam.targetSupply && !inDataRange(supplyRange, chartParam.targetSupply))) {
                    updateChartData();
                    refreshCurve = true;
                    refreshArea = true;
                    refreshNewCurve = true;
                }
    
                if (refreshCurve) {
                    removeDot('dot-target');
                    removeLine('line');
                }
    
                if (refreshArea) {
                    removeLiquidityArea();
                }
    
                if (refreshNewCurve) {
                    removeLine('target-line');
                }
    
                drawBondingCurve(refreshCurve, refreshArea, refreshNewCurve);
            }
        }
        
    }

    function drawBondingCurve(refreshCurve: boolean, refreshArea: boolean, refreshNewCurve: boolean) {
        if(chartParam){
            if (refreshCurve) {
                drawCurve(chartParam.curveParameter, 'line');
            }
    
            if (chartParam.newCurveParam && refreshNewCurve) {
                drawCurve(chartParam.newCurveParam, 'target-line');
            }
    
            if (chartParam.targetSupply && refreshArea) {
                drawLiquidityArea();
            } else {
                drawDot(chartParam.curveParameter, chartParam.currentSupply, 'dot-target');
            }
        }
    }

    function inDataRange(dataRange: number[], data: number) {
        return data >= dataRange[0] && data <= dataRange[dataRange.length - 1];
    }

    function drawLiquidityArea() {

        if (chartState && chartState.chart && chartParam && chartParam.targetSupply) {
            const supplyRange = chartState?.supplyRange;
            let minSupply = 0, maxSupply = 0;
            if (chartParam.currentSupply < chartParam.targetSupply) {
                minSupply = chartParam.currentSupply;
                maxSupply = chartParam.targetSupply;
            } else {
                minSupply = chartParam.targetSupply;
                maxSupply = chartParam.currentSupply;
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

            drawArea(chartParam, areaDataRange);
            drawDot(chartParam.curveParameter, chartParam.targetSupply, 'dot-target');
            drawDot(chartParam.curveParameter, chartParam.currentSupply, 'dot-from');
        }
    }

    function drawDot(param: ICurveParam, supply: number, className: string) {

        if (chartState && chartState.chart) {
            const chart = chartState?.chart;
            const xScale = chartState?.xScale;
            const yScale = chartState?.yScale;
            const supplyRange = chartState?.supplyRange;

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

    function drawCurve(param: ICurveParam, className: string) {

        if (chartState && chartState.chart) {
            const chart = chartState?.chart;
            const xScale = chartState?.xScale;
            const yScale = chartState?.yScale;
            const supplyRange = chartState?.supplyRange;

            const parameterK = param.parameterK;
            const parameterM = param.parameterM;

            // Data
            const data = supplyRange.map((d) => ({
                x: d,
                y: parameterM / (d ** parameterK)
            }));

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
        removeDot('dot-target');
        removeDot('dot-from');
    }

    function removeArea() {
        if (chartState && chartState.chart) {
            chartState.chart.select(".area").remove();
        }
    }

    function removeLine(className: string) {
        if (chartState && chartState.chart) {
            chartState.chart.select(className).remove();
        }
    }

    function removeDot(className: string) {
        if (chartState && chartState.chart) {
            chartState.chart.select(className).remove();
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

    function drawArea(param: IChartParam, supplyRange: number[]) {

        if (chartState && chartState.chart) {
            const chart = chartState?.chart;
            const xScale = chartState?.xScale;
            const yScale = chartState?.yScale;


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
            font-family: Roboto Mono;
            font-size: 14px;
            font-style: normal;
            font-weight: 500;
            line-height: 25px;
            letter-spacing: 5.6px;
        }

        .text-price{
            position: absolute;
            top: 20px;
            left: 5px;
            color: #DDE2EA;
            text-align: right;
            text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
            font-family: Roboto Mono;
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
            font-family: Roboto Mono;
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
