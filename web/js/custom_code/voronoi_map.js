L.mapbox.accessToken = 'pk.eyJ1Ijoicm9iaW5saW5hY3JlIiwiYSI6IjAwYTg3MDAwNmFlZTk3MDlhNGIxY2VjNDk5Yjk4NWE1In0.DWAN8Om-9kOnwVTQIiDGaw';
map = L.mapbox.map('map', 'mapbox.light');
map.setView([53, 0], 7);
url = '';

// These deferreds are used when we have a proper web server.
var p1 = $.ajax("data/uk.json")
var p2 = $.ajax("data/final_full_time_series.csv")


var p3 = jQuery.Deferred();
map.on('ready', function(d) {
    p3.resolve("hurray")
})


// Wait for all data to be loaded, and for the map to be ready, and then draw the map
$.when(p1, p2, p3).done(function(uk_clip_data, csvdata, x) {

    var uk_clip_data = uk_clip_data[0]
    var points_data = d3.csv.parse(csvdata[0])

    _.each(points_data, function(d) {
        var this_date = d3.time.format("%Y-%m-%d").parse(d["date"])

        d["month_text"] = d3.time.format("%B %Y")(this_date)
        d["date"] = this_date
    })

    data_holder = new DataHolder(column_descriptions_data, colour_options, points_data)

    data_holder.process_column_descriptions()
    data_holder.numerical_to_float()
    data_holder.extract_totals()
    data_holder.filter_out_invalid_coordinates()
    data_holder.set_domains()

    voronoi_map(map, uk_clip_data, data_holder)

    d3.select("#plus_dates").on("click", function(d) {

        var current = $("#filter_records_date_field").val()
        var months = data_holder.column_descriptions_data["month_text"]["domain"];

        var current_index = months.indexOf(current)
        var new_index = Math.min(current_index + 1, months.length - 1)
        var new_month = months[new_index]

        $("#filter_records_date_field").val(new_month).change();

    });

    d3.select("#minus_dates").on("click", function(d) {

        var current = $("#filter_records_date_field").val()
        var months = data_holder.column_descriptions_data["month_text"]["domain"];

        var current_index = months.indexOf(current)
        var new_index = Math.max(current_index - 1, 0)
        var new_month = months[new_index]

        $("#filter_records_date_field").val(new_month).change();

    })



})


// $.when(p3).done(function(x) {

//     process_column_descriptions(points)
//     numerical_to_float(points)
//     set_domains(points)
//     filter_out_invalid_coordinates(points)

//     var uk_clip_data = uk
//     var points_data = points
//     voronoi_map(map, uk_clip_data, points_data)
// })

function voronoi_map(map, uk_clip_data, data_holder) {


    var filteredPoints = [], //Stores the points within the current map bounds (at current zoom level)
        uk = uk_clip_data, //Stores data for clipping mask
        listOfMetrics, //Store the different metrics (metric_1, metric_2 etc)
        lastSelectedPoint, //So the tooltip 'remembers' where we were when we leave the map area
        plotDataField //Which metric?
        // colour_scales_dict = {};


    var voronoi = d3.geom.voronoi()
        .x(function(d) {
            return d.x;
        })
        .y(function(d) {
            return d.y;
        });

    var update_hover_panel = function() {
        d3.selectAll('.selected').classed('selected', false);

        var cell = d3.select(this),
            point = cell.datum();

        lastSelectedPoint = point;
        cell.classed('selected', true);


        var template_dict = {}
        _.each(data_holder.column_descriptions_data, function(d, k) {
            template_dict[k] = d["format"](point[k])
        })

        var source = $("#view_location_info").html();
        var template = Handlebars.compile(source);
        var html = template(template_dict);
        d3.select('#selected')
            .html(html)

        //Draw charts
        data_holder.set_time_series(point.moj_prison_name)
        holder = d3.select("#perc_pop_to_used_cna_holder")
        chart = new TimeSeriesChart(holder, "perc_pop_to_used_cna", data_holder.time_series)

        holder = d3.select("#perc_acc_available_holder")
        chart = new TimeSeriesChart(holder, "perc_acc_available", data_holder.time_series)

        holder = d3.select("#operational_capacity_holder")
        chart = new TimeSeriesChart(holder, "operational_capacity", data_holder.time_series)

        holder = d3.select("#population_holder")
        chart = new TimeSeriesChart(holder, "population", data_holder.time_series)


        data_holder.set_time_series("Total")
        holder = d3.select("#total_population_holder")
        chart = new TimeSeriesChart(holder, "population", data_holder.all_total_points)

        d3.select("#total_population_holder .title").text("Total prison population")
            .attr("font-weight", "bold")


        d3.select("#total_population_holder path.line")
            .attr("stroke", "red")


    }



    var draw_map_key_categorical = function() {

        var scale = data_holder.column_descriptions_data[$("#keyOptions").val()]["colour_scale"]

        var key_position_top = 200;
        var key_position_left = 60;
        var key_height = 300;

        var bounds = map.getBounds(),
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
            bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
            existing = d3.set(),
            drawLimit = bounds.pad(0.4);



        // Need a scale that turns domain into height then just draw rectanges and text
        var axis_scale = d3.scale.ordinal().domain(scale.domain()).rangeBands([scale.domain().length * 20, 0])

        var svg = d3.select(map.getPanes().overlayPane).append("svg")
            .attr('id', 'map_key')
            .attr("class", "leaflet-zoom-hide")
            .style("width", map.getSize().x + 'px')
            .style("height", map.getSize().y + 'px')
            .style("margin-left", topLeft.x + "px")
            .style("margin-top", topLeft.y + "px")
            .style("pointer-events", "none");

        var key_elements = svg.append("g")
            .attr("transform", "translate(" + key_position_left + "," + key_position_top + ")")
            .selectAll(".keyrects")
            .data(scale.domain())
            .enter()

        key_elements
            .append("rect")
            .attr("x", 0)
            .attr("y", function(d) {
                return axis_scale(d)
            })
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", function(d) {
                return scale(d)
            })

        key_elements.append("text")
            .text(function(d) {
                return d
            })

        .attr("x", 20)
            .attr("y", function(d) {
                return axis_scale(d) + 10
            })
    }


    var draw_map_key_continuous = function() {

        var key_position_top = 200
        var key_position_left = 60
        var key_height = 300

        var bounds = map.getBounds(),
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
            bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
            existing = d3.set(),
            drawLimit = bounds.pad(0.4);

        var num_steps = 50;


        var map_colour_scale = data_holder.column_descriptions_data[$("#keyOptions").val()]["colour_scale"];


        var num_cats = map_colour_scale.domain().length

        var axis_scale = d3.scale.linear().domain(map_colour_scale.domain()).range(d3.range(key_height, -0.001, -key_height / (num_cats - 1)))

        var inverted_scale = axis_scale.invert;

        var svg = d3.select(map.getPanes().overlayPane).append("svg")
            .attr('id', 'map_key')
            .attr("class", "leaflet-zoom-hide")
            .style("width", map.getSize().x + 'px')
            .style("height", map.getSize().y + 'px')
            .style("margin-left", topLeft.x + "px")
            .style("margin-top", topLeft.y + "px")
            .style("pointer-events", "none");

        steps = _.map(d3.range(num_steps), function(i) {
            return i * key_height / num_steps
        })

        svg.append("g")
            .attr("transform", "translate(" + key_position_left + "," + key_position_top + ")")
            .selectAll(".keyrects")
            .data(steps)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", function(d) {
                return d
            })
            .attr("width", 10)
            .attr("height", (key_height / num_steps) * 1.0)
            .attr("fill", function(d) {
                return map_colour_scale(inverted_scale(d))
            })

        var yAxis = d3.svg.axis()
            .scale(axis_scale)
            .orient("left")
            .ticks(10, ",0.2s")
            .tickSize(-10, 0)
            .tickFormat(data_holder.column_descriptions_data[$("#keyOptions").val()]["format"])


        svg.append("g")
            .attr("transform", "translate(" + key_position_left + "," + key_position_top + ")")
            .attr("class", "y axis")
            .call(yAxis)

        svg.append("g")
            .attr("transform", "translate(90," + key_position_top + ") rotate(90)")
            .append("text")
            .text(function(d) {
                return data_holder.column_descriptions_data[$("#keyOptions").val()]["long_name"]
            })
            .style("font-weight", "bold")
            .style("font-size", "12px")

        svg.append("g").attr("transform", "translate(" + (key_position_left - 30) + "," + (key_position_top - 10) + ")")
            .append("text")
            .text("Key:")
            .style("font-weight", "bold")
            .style("font-size", "12px")
    }


    var getListOfMetrics = function() {
        var fields = _.filter(data_holder.column_descriptions_data, function(d) {
            return d["manually_included"]
        })
        var list = _.map(fields, function(d) {
            return d.key
        })
        return list
    }

    function remove_fieldset(fs_num) {
        d3.select("[fs_num='" + fs_num + "']").remove()
        drawWithLoading()

    }

    function add_fieldset() {

        //Data should be the existing list of fieldsets.
        var bounddata = d3.select("#fieldsetholder").selectAll("fieldset").data();

        var new_num = Math.max(bounddata) + 1
        bounddata.push(new_num)


        var num_fieldsets = d3.select("#fieldsetholder").selectAll("fieldset")[0].length;
        var data = d3.range(num_fieldsets + 1)

        var fieldsets_enter = d3.select("#fieldsetholder").selectAll("fieldset").data(data).enter()
            .append("fieldset")
            .attr("fs_num", function(d) {
                return d;
            });

        fieldssets_select = fieldsets_enter.append("select")
            .attr("name", "filter_records_field")
            .attr("class", "filter_records_categorical_field")
            .on("change", function() {
                // Get fs_num, look up in data and enter options into second field
                var fs_num = d3.select(this.parentNode).attr("fs_num")

                var this_col = $(this).val()

                //Now need to populate second list box with correct values 
                var unique_values = _.unique(_.map(data_holder.all_points, function(d) {
                    return d[this_col]
                }))

                var option_values_select_box = d3.select("[fs_num='" + fs_num + "']").select(".filter_records_categorical_value");


                var option_selections = option_values_select_box.selectAll("option")
                    .data(unique_values)


                option_selections.enter().append("option")
                    .attr("value", function(d) {
                        return d
                    })
                    .text(function(d) {
                        return d
                    })

                option_selections
                    .attr("value", function(d) {
                        return d
                    })
                    .text(function(d) {
                        return d
                    })

                option_selections.exit().remove()

                drawWithLoading()

            })

        fieldssets_select.selectAll("select")
            .data(filter_options)
            .enter()
            .append("option")
            .attr("value", function(d) {
                return d["column"]
            })
            .text(function(d) {
                return d["text"]
            })


        fieldsets_enter.append("select")
            .attr("name", "filter_records_field")
            .attr("class", "filter_records_categorical_value")
            .on("change", function() {
                drawWithLoading()
            })

        fieldsets_enter.append("button").text("-")
            .on("click", function() {
                var fs_num = d3.select(this.parentNode).attr("fs_num")
                remove_fieldset(fs_num)
            })

    }

    var drawMetricSelection = function() {

        _.each(["#shadingOptions", "#pointShadingOptions", "#pointSizeOptions", "#keyOptions"], function(selector) {
            d3.select(selector).selectAll('option')
                .data(["none"].concat(listOfMetrics))
                .enter()
                .append("option")
                .attr("value", function(d) {
                    return d
                })
                .text(function(d) {
                    return data_holder.column_descriptions_data[d].long_name
                })

            d3.select(selector).on("change", function(d) {

                $("#keyOptions").val(this.value)

                drawWithLoading()

                // Automatically change key
            })

        })

        // Populate 
        var all_metrics = data_holder.column_descriptions_data
        d3.select("#filter_records_field").selectAll('option')
            .data(_.map(data_holder.column_descriptions_data, function(d, k) {
                return d
            }))
            .enter()
            .append("option")
            .attr("value", function(d) {
                return d.key;
            })
            .text(function(d) {
                return d.long_name
            })

        d3.select("#filter_records_date_field")
            .selectAll('option')
            .data(data_holder.column_descriptions_data["month_text"]["domain"])
            .enter()
            .append('option')
            .attr("value", function(d) {
                return d
            })
            .text(function(d) {
                return d
            })

        add_fieldset()
        d3.select("#new_fieldset_button").on("click", function() {
            add_fieldset();
        })

        $("#filter_records_field").val("none");
        d3.select("#filter_records_field").on("change", function(d) {
            drawWithLoading()
        })
        d3.select("#filter_records_text").on("change", function(d) {
            drawWithLoading()
        })
        $("#filter_records_date_field").on("change", function(d) {

            drawWithLoading()
        })

        // First option
        $("#shadingOptions").val(listOfMetrics[0]);
        $("#keyOptions").val(listOfMetrics[0]);
        var mylen = data_holder.column_descriptions_data["month_text"]["domain"].length
        var new_month = data_holder.column_descriptions_data["month_text"]["domain"][mylen - 1]
        $("#filter_records_date_field").val(new_month)

    }

    var drawColourSelection = function() {

        var data = _.keys(data_holder.colour_options)

        d3.select("#colourOptions").selectAll('option')
            .data(data)
            .enter()
            .append("option")
            .attr("value", function(d) {
                return d
            })
            .text(function(d) {
                return d
            })

        d3.select("#colourOptions").on("change", function(d) {
            drawWithLoading()
        })

    }


    var drawWithLoading = function(e) {
        d3.select('#loading').classed('visible', true);
        if (e && e.type == 'viewreset') {
            d3.select('#overlay').remove();
        }

        setTimeout(function() {
            draw();
            d3.select('#loading').classed('visible', false);
        }, 0);
    }

    var get_options = function() {
        plotDataField = d3.select("#shadingOptions").node().value;
        colourScaleOption = d3.select("#colourOptions").node().value;
    }

    var draw = function() {

        data_holder.filter_points()

        d3.select('#overlay').remove();
        d3.select('#map_key').remove();

        d3.select('#selected')
            .html("<h1>Hover over voronoi areas to display statistics</h1>")

        get_options()

        var bounds = map.getBounds(),
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
            bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
            existing = d3.set(),
            drawLimit = bounds.pad(0.4);

        filteredPoints = data_holder.points.filter(function(d) {
            var latlng = new L.LatLng(d.lat, d.lng);

            if (!drawLimit.contains(latlng)) {
                return false
            };

            var point = map.latLngToLayerPoint(latlng);

            key = point.toString();
            if (existing.has(key)) {
                return false
            };
            existing.add(key);


            d.x = point.x;
            d.y = point.y;
            return true;
        });


        data_holder.update_colour_scales();

        var svg = d3.select(map.getPanes().overlayPane).append("svg")

        voronoi(filteredPoints).forEach(function(d) {
            d.point.cell = d;
        });



        var svg = d3.select(map.getPanes().overlayPane).append("svg")
            .attr('id', 'overlay')
            .attr("class", "leaflet-zoom-hide")
            .style("width", map.getSize().x + 'px')
            .style("height", map.getSize().y + 'px')
            .style("margin-left", topLeft.x + "px")
            .style("margin-top", topLeft.y + "px");

        var g = svg.append("g")
            .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

        var svgPoints = g.attr("class", "voronoi_areas")
            .selectAll("g")
            .data(filteredPoints)
            .enter().append("g")
            .attr("class", "point");

        var buildPathFromPoint = function(point) {
            return "M" + point.cell.join("L") + "Z";
        }




        svgPoints.append("path")
            .attr("class", "point-cell")
            .attr("d", buildPathFromPoint)
            .style("fill", function(d) {
                field = d3.select("#shadingOptions").node().value
                return data_holder.column_descriptions_data[plotDataField]["colour_scale"](d[plotDataField])
            })
            .style("fill-opacity", function(d) {
                if (d3.select("#shadingOptions").node().value == "none") {
                    return 0.1
                } else {
                    return 0.7
                }
            })
            .style("stroke-opacity", function(d) {
                if (d3.select("#shadingOptions").node().value == "none") {
                    return 0.1
                } else {
                    return 0.7
                }
            })
            .on('mouseover', update_hover_panel)
            .classed("selected", function(d) {
                return lastSelectedPoint == d
            });

        g.attr("clip-path", "url(#EWClipPath)")

        var vor_points = svg.append("g")
            .selectAll("g .voronoi_points")
            .data(filteredPoints)
            .enter().append("g")
            .attr("class", "point")
            .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

        vor_points.append("circle")
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .style('fill', function(d) {
                var metric = d3.select("#pointShadingOptions").node().value
                if (metric == "none") {
                    return "#000"
                } else {
                    return data_holder.column_descriptions_data[metric]["colour_scale"](d[metric])
                }
            })
            .attr("r", function(d) {

                var metric = d3.select("#pointSizeOptions").node().value

                if (metric == "none") {
                    var pointsize = d3.select("#shadingOptions").node().value
                    if (pointsize == "none") {
                        return 8
                    } else {
                        return 3
                    }
                } else {
                    var this_domain = data_holder.column_descriptions_data[metric]["domain"]
                    var this_range = [1, 8]
                    var this_scale = d3.scale.linear().domain(this_domain).range(this_range)
                    return this_scale(d[metric])
                }

            })
            .attr("fill-opacity", function(d) {

                var metric = d3.select("#pointSizeOptions").node().value
                if (metric == "none") {
                    return 1
                } else {
                    return 0.6
                }

            });


        if (data_holder.column_descriptions_data[$("#keyOptions").val()]["is_categorical"]) {
            draw_map_key_categorical()
        } else {
            draw_map_key_continuous()
        };

        //*******************
        //Draw clipping mask
        //*******************


        var allCountries = topojson.object(uk, uk.objects.subunits);
        allCountries.geometries = [allCountries.geometries[0], allCountries.geometries[4]] //England, Wales and Scotland

        function projectPoint(x, y) {
            var point = map.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }
        var transform = d3.geo.transform({
            point: projectPoint
        })

        var path = d3.geo.path().projection(transform);

        g.append("svg:clipPath")
            .attr("id", "EWClipPath")
            .append("svg:path")
            .datum(allCountries)
            .attr("d", path);


    }

    var mapLayer = {
        onAdd: function(map) {
            map.on('viewreset moveend', drawWithLoading);
            drawWithLoading();
        }
    };


    listOfMetrics = getListOfMetrics()

    drawMetricSelection();
    drawColourSelection();
    data_holder.update_colour_scales();
    map.addLayer(mapLayer);
}