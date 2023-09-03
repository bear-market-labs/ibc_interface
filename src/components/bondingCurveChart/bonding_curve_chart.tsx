import React from 'react';
import * as d3 from 'd3';
import * as _ from "lodash";
import { useCallback, useEffect, useState } from 'react';
import './bonding_curve_chart.css';

interface ICurveParam {
    parameterK: number;
    parameterM: number;
}

interface IChartParam {
    currentSupply: number;
    curveParameter: ICurveParam;
    targetSupply?: number;
    newCurveParam?: ICurveParam;
}
interface IProps {
    chartParam: IChartParam
}

interface IState {

}
class BondingCurveChart extends React.Component<IProps, IState> {
    ref!: SVGSVGElement;
    chartParam: IChartParam;
    innerWidth = 0;
    innerHeight = 0;

    MAX_SUPPLY_FACTOR = 10;
    MIN_SUPPLY_FACTOE = 0.2;

    constructor(props: IProps) {
        super(props);
        this.chartParam = props.chartParam;
    }

    private buildGraph() {

        let currentSupply = this.chartParam.currentSupply;
        if(this.chartParam.targetSupply && this.chartParam.targetSupply > currentSupply){
            currentSupply = this.chartParam.targetSupply
        }



        let xDomain = [0, currentSupply * 10];
        let yDomain = [0, 1000];

        // Dimensions
        let width = this.ref?.parentElement?.clientWidth || 400; // Get the width of the parent container
        let height = this.ref?.parentElement?.clientHeight || 300;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.innerWidth = width - margin.left - margin.right;
        this.innerHeight = height - margin.top - margin.bottom;

        let beginSupply = 0;
        let endSupply = xDomain[1] * 0.005;
        let dataRange = d3.range(beginSupply, endSupply, endSupply/100);
        dataRange = dataRange.slice(1);
        beginSupply = endSupply;
        endSupply = xDomain[1] *0.1;
        dataRange = dataRange.concat(d3.range(beginSupply, endSupply, (endSupply - beginSupply)/100));
        beginSupply = endSupply;
        endSupply = xDomain[1];
        dataRange = dataRange.concat(d3.range(beginSupply, endSupply, (endSupply - beginSupply)/100));


        const currentPrice = this.chartParam.curveParameter.parameterM / (currentSupply ** this.chartParam.curveParameter.parameterK)
        const maxY = currentPrice * this.MAX_SUPPLY_FACTOR;
        const minY = currentPrice * this.MIN_SUPPLY_FACTOE;

        yDomain[1] = maxY;

        let beginIndex = _.findIndex(dataRange, supply =>{
            return (this.chartParam.curveParameter.parameterM / (supply ** this.chartParam.curveParameter.parameterK)) <= maxY;
        });
        let endIndex = _.findIndex(dataRange, supply =>{
            return (this.chartParam.curveParameter.parameterM / (supply ** this.chartParam.curveParameter.parameterK)) <= minY;
        });

        dataRange = _.slice(dataRange, beginIndex, endIndex);
        xDomain[1] = dataRange[dataRange.length -1];

        const xScale = d3.scaleLinear().domain(xDomain).range([0, this.innerWidth]);
        const yScale = d3.scaleLinear().domain(yDomain).range([this.innerHeight, 0]);

        d3
            .select(this.ref)
            .select('svg')
            .remove();

        // SVG element
        const svg = d3
            .select(this.ref)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Chart group
        const chart = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const numGridLines = 7;
        let xGridValues = d3.range(yDomain[0], yDomain[1], yDomain[1] / numGridLines);
        xGridValues.push(yDomain[1]);
        const xGrid = d3
            .axisLeft(yScale)
            .tickValues(xGridValues)
            .tickSize(-this.innerWidth)
            .tickFormat(null);

        chart.append('g').attr('class', 'grid').call(xGrid);

        // Remove ticks and default vertical grid line
        chart.selectAll('.domain').remove();
        chart.selectAll('.grid text').remove();

        this.drawCurve(chart, xScale, yScale, this.chartParam.curveParameter, dataRange, 'line');

        if (this.chartParam.newCurveParam) {
            this.drawCurve(chart, xScale, yScale, this.chartParam.newCurveParam, dataRange, 'target-line');
        }

        if (this.chartParam.targetSupply) {
            let minSupply = 0, maxSupply = 0;
            if (this.chartParam.currentSupply < this.chartParam.targetSupply) {
                minSupply = this.chartParam.currentSupply;
                maxSupply = this.chartParam.targetSupply;
            } else {
                minSupply = this.chartParam.targetSupply;
                maxSupply = this.chartParam.currentSupply;
            }

            let beginIndex = _.findIndex(dataRange, item => {
                return item >= minSupply;
            });

            let endIndex = _.findIndex(dataRange, item => {
                return item >= maxSupply;
            });

            if (beginIndex < 0) {
                beginIndex = 0;
            }

            if (endIndex < 0) {
                endIndex = dataRange.length;
            }

            let areaDataRange = _.slice(dataRange, beginIndex, endIndex);
            areaDataRange.splice(0, 0, minSupply);
            areaDataRange.push(maxSupply);

            this.drawArea(chart, xScale, yScale, this.chartParam, areaDataRange);
            this.drawDot(chart, xScale, yScale, this.chartParam.curveParameter, this.chartParam.targetSupply, 'dot-target');
            this.drawDot(chart, xScale, yScale, this.chartParam.curveParameter, this.chartParam.currentSupply, 'dot-from');

        } else {
            this.drawDot(chart, xScale, yScale, this.chartParam.curveParameter, this.chartParam.currentSupply, 'dot-target');
        }

        chart
            .append('text')
            .attr('class', 'text-issuance')
            .attr('x', this.innerWidth)
            .attr('y', this.innerHeight + 20)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'baseline')
            .style('fill', 'white')
            .text('ISSUANCE');
    }

    drawDot(chart: any, xScale: any, yScale: any, param: ICurveParam, supply: number, className: string) {
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

    drawCurve(chart: any, xScale: any, yScale: any, param: ICurveParam, supplyRange: number[], className: string) {

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

    drawArea(chart: any, xScale: any, yScale: any, param: IChartParam, supplyRange: number[]) {

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
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut);

        function handleMouseOver(event: any) {
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
            tooltipGroup.append('text')
                .attr('class', 'tooltip-text')
                .attr('x', x - 25)
                .attr('y', y - 45)
                .attr('text-anchor', 'left')
                .style('font-size', '10px')
                .style('white-space', 'pre')
                .text(`Supply   : ${param.currentSupply} -> ${param.targetSupply}`);
            // tooltipGroup.append('text')
            //     .attr('class', 'tooltip-text')
            //     .attr('x', x - 25)
            //     .attr('y', y - 30)
            //     .attr('text-anchor', 'left')
            //     .style('font-size', '10px')
            //     .style('white-space', 'pre')
            //     .text("Reserve : 178.56 -> 192.39");
        }

        function handleMouseOut() {
            chart.select('.tooltip-group').remove();
        }

    }

    componentDidMount() {
        // activate   
        this.buildGraph();
    }

    render() {
        return (<div className="svg">
            <div className="text-price">PRICE</div>
            <svg className="chart-container" ref={(ref: SVGSVGElement) => this.ref = ref}></svg>
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
}


export default BondingCurveChart;