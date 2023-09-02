import React from 'react';
import * as d3 from 'd3';
import { useCallback, useEffect, useState } from 'react';

interface IProps {
  
}

interface IState {
  
}
class BondingCurveChart extends React.Component<IProps, IState> {
    ref!: SVGSVGElement; 
    
    private buildGraph() {

            const parameterK = 0.5;
            const parameterM = 1;
            let yDomain = [0,10];


            let dataRange = d3.range(0, 1, 0.01);
            dataRange = dataRange.slice(1);
            dataRange = dataRange.concat(d3.range(1, 10, 0.1));
            console.log(dataRange)
            // Data
            const data = dataRange.map((d) => ({ x: d, 
                y: parameterM/(d ** parameterK) }));

            console.log(data);
        
            // Dimensions
            const width = 600;
            const height = 300;
            const margin = { top: 20, right: 20, bottom: 30, left: 40 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
        
            // Scales
            const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
            const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);
        
            // Line generator
            const line = d3
              .line<{ x: number; y: number }>()
              .x((d) => xScale(d.x))
              .y((d) => yScale(d.y));
        
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
        
            // X-axis
            // chart
            //   .append('g')
            //   .attr('transform', `translate(0,${innerHeight})`)
            //   .call(d3.axisBottom(xScale));
        
            // // Y-axis
            // chart.append('g').call(d3.axisLeft(yScale));
        
            // Horizontal grid lines
            // chart
            //   .append('g')
            //   .attr('class', 'grid')
            //   .call(
            //     d3
            //       .axisLeft(yScale)
            //       .tickSize(-innerWidth)
            //       .tickFormat(null)
            //       .ticks(9)
            //   );

            const numGridLines = 7;
            let xGridValues = d3.range(yDomain[0], yDomain[1], yDomain[1]/numGridLines);
            xGridValues.push(yDomain[1]);
            const xGrid = d3            
            .axisLeft(yScale)
            .tickValues(xGridValues)
            .tickSize(-innerWidth)
            .tickFormat(null);

            chart.append('g').attr('class', 'grid').call(xGrid);              
        
            // Remove ticks and default vertical grid line
            chart.selectAll('.domain').remove();
            chart.selectAll('.grid text').remove();
            // chart.selectAll('.tick line').remove();

            // Line
            chart
              .append('path')
              .datum(data)
              .attr('class', 'line')
              .attr('d', line);

            chart
              .append('text')
              .attr('class', 'text-issuance')
              .attr('x', innerWidth)
              .attr('y', innerHeight + 20)
              .attr('text-anchor', 'end')
              .attr('dominant-baseline', 'baseline')
              .style('fill', 'white')
              .text('ISSUANCE'); 
              
            // chart
            //   .append('text')
            //   .attr('class', 'text-price')
            //   .attr('x', 0)
            //   .attr('y', 0)
            //   .attr('text-anchor', 'start')
            //   .attr('dominant-baseline', 'hanging')
            //   .style('fill', 'white')
            //   .text('PRICE')
            //   .attr('transform', 'rotate(90)');              
      
    }
    
    componentDidMount() {
      // activate   
      this.buildGraph();
    }
  
    render() {
      return (<div className="svg">
        <div className="text-price">PRICE</div>
        <svg className="chart-container" ref={(ref: SVGSVGElement) => this.ref = ref} width='600' height='300'></svg>
        <style>{`
        .svg{
            position: relative;
        }
        .chart-container {
            width: 600px;
            height: 300px;
            background-color: #1C1931;
        }

        .line {
            fill: none;
            stroke: #2087BA;
            stroke-width: 2px;
        }

        .grid  line{    
            stroke: rgba(255, 255, 255, 0.30);
        }

        .area{
            fill: rgba(32, 135, 186, 0.60);
        }

        .dot-to{
            fill: #DDE2EA;
            stroke-width: 2px;
            stroke: #2087BA;
        }
        .dot-from{
            fill: #2087BA;
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
      `}</style>
      </div>);
    }
}


export default BondingCurveChart;