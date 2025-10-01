var margin = {top: 30, right: 10, bottom: 10, left: 0},
    width  = 1100 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var svg = d3.select("svg.ph_plot")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("dataset_filled.csv").then(function(data) {

  const color = d3.scaleSequential(d3.interpolateViridis)
    .domain(d3.extent(data, d => +d.birthyear));

  const dimensions = ["anon_id","birthyear","dischage","deathageday","gest","zpreterm","bpdgrade"];

  for (const d of data) {
    for (const p of dimensions) d[p] = +d[p];
  }

  const y = {};
  y.anon_id     = d3.scaleLinear().domain([0, 220000]).range([height, 0]);
  y.birthyear   = d3.scaleLinear().domain([2010, 2022]).range([height, 0]);
  y.dischage    = d3.scaleLinear().domain([-10, 550]).range([height, 0]);
  y.deathageday = d3.scaleLinear().domain([-10, 550]).range([height, 0]);
  y.gest        = d3.scaleLinear().domain([23, 32]).range([height, 0]);
  y.zpreterm    = d3.scaleLinear().domain([-4, 4]).range([height, 0]);
  y.bpdgrade    = d3.scaleLinear().domain([-1, 3]).range([height, 0]);


  const axis_dischage = d3.axisLeft(y.dischage)
    .tickValues([-10,0,50,100,150,200,250,300,350,400,450,500,550])
    .tickFormat(d3.format("d"));
  const axis_deathageday = d3.axisLeft(y.deathageday)
    .tickValues([-10,0,50,100,150,200,250,300,350,400,450,500,550])
    .tickFormat(d3.format("d"));
  const axis_bpdgrade = d3.axisLeft(y.bpdgrade)
    .tickValues([-1, 0, 1, 2, 3])
    .tickFormat(d3.format("d"));


  const x = d3.scalePoint()
    .range([0, width])
    .padding(1)
    .domain(dimensions);


  const lineGen = d3.line();
  const SCALED_Y = data.map(d => dimensions.map(p => y[p](d[p])));
  const PATHS = data.map((d, i) =>
    lineGen(dimensions.map((p, j) => [x(p), SCALED_Y[i][j]]))
  );


  function path(d) {
    return d3.line()(dimensions.map(function(p) {
      return [x(p), y[p](d[p])];
    }));
  }

  const background = svg.append("g").attr("class","background");
  background.selectAll("path")
    .data(data)
    .join("path")
      .attr("d", (d,i) => PATHS[i])  
      .style("fill", "none")
      .style("stroke", "#FFFFFF")
      .style("opacity", 0.6);

  const foreground = svg.append("g").attr("class","foreground");
  foreground.selectAll("path")
    .data(data)
    .join("path")
      .attr("d", (d,i) => PATHS[i])   
      .style("fill", "none")
      .style("stroke", d => color(d.birthyear))
      .style("opacity", 0.7)
      .style("pointer-events","none"); 

 
  const myaxis = svg.selectAll("myAxis")
    .data(dimensions).enter()
    .append("g")
      .attr("transform", d => `translate(${x(d)},0)`)
      .each(function(d) {
        let axis = d3.axisLeft(y[d]);
        if (d === "dischage")    axis = axis_dischage;
        if (d === "deathageday") axis = axis_deathageday;
        if (d === "bpdgrade")    axis = axis_bpdgrade;
        d3.select(this).call(axis);
      });

  myaxis.append("text")
    .style("text-anchor", "middle")
    .attr("y", -9)
    .text(d => d)
    .style("fill", "black");

  svg.selectAll("g")
    .filter(d => dimensions.includes(d))
    .selectAll(".tick text")
      .attr("fill", "#000000")
      .attr("paint-order", "stroke")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-opacity", 0.8);

  
  const brushNodes = {};

  function brushstart(event){
    if (event.sourceEvent) event.sourceEvent.stopPropagation();
  }

  function currentExtent(dim){
    const sel = d3.brushSelection(brushNodes[dim]); 
    if (!sel) return null;
    const [y0, y1] = sel;
    const v0 = y[dim].invert(y1);  
    const v1 = y[dim].invert(y0);
    return [Math.min(v0, v1), Math.max(v0, v1)];
  }

 
  function brushed(event){
    const actives = dimensions.filter(p => currentExtent(p) !== null);
    const extents = actives.map(p => currentExtent(p));

    foreground.selectAll("path")
      .style("display", d => {
        for (let i = 0; i < actives.length; i++){
          const p = actives[i];
          const v = d[p];              
          const [lo, hi] = extents[i];
          if (!Number.isFinite(v) || v < lo || v > hi) return "none";
        }
        return null; 
      });
  }

  function throttle(fn, ms){
    let t = 0, id = null, lastArgs=null, lastThis=null;
    return function(...args){
      const now = Date.now();
      lastArgs = args; lastThis = this;
      const run = () => { t = Date.now(); id=null; fn.apply(lastThis, lastArgs); };
      if (now - t >= ms) run();
      else { if (id) clearTimeout(id); id = setTimeout(run, ms - (now - t)); }
    };
  }
  
  const brushedThrottled = throttle(brushed, 30); 


  myaxis.append("g")
    .attr("class", "brush")
    .each(function(dim){
      y[dim].brush = d3.brushY()
        .extent([[-8, 0], [8, height]])
        .on("start", brushstart)
        .on("brush",  brushedThrottled) 
        .on("end",    brushed);         

      d3.select(this).call(y[dim].brush);
      brushNodes[dim] = this;

      d3.select(this).selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);
    });
}).catch(err => console.error(err));



