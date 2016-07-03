column_descriptions_data = {
    "baseline_cna": {
        "long_name": "Baseline CNA",
    },
    "in_use_cna": {
        "long_name": "In use CNA",
    },
    "operational_capacity": {
        "long_name": "Operational capacity",
        "format": d3.format(",.0f")
    },
    "population": {
        "long_name": "Population",
        "format": d3.format(",.0f")
    },
    "perc_pop_to_used_cna": {
        "long_name": "Ratio of population to in use CNA",
        "format": d3.format(",.0%"),
        "domain": [0.6,1,1.8]
    },
    "perc_acc_available": {
        "long_name": "Percentage of accomodation available",
        "format": d3.format(",.0%"),
    },
    "dt_youth" : {
        "long_name": "Youth or adult"
    },
     "dt_category" : {
        "long_name": "Prison category"
    },
     "dt_region" : {
        "long_name": "Prison region"
    }

}


var colour_options = {
    "Red (high) to green (low)": ["#6AE817", "#FFD52D", "#B30409"],
    "Green (high) to red (low)": ["#B30409", "#FFD52D", "#6AE817"],
    "Blues": ["#A9BCD3", "#3C81B9", "#27298B"],
    "Greens": ["#3AFF17", "#00660F", "#000000"],
    "Greys": ["#D2EAEE", "#738F95", "#2B333C"],
    "Red and blue": ["#810303", "#542460", "#177CF7"],
};


// {
//     "metric_3": {
//         "long_name": "My metric 3",
//         "format": d3.format(",.1%"),
//         "domain": [0, 0.5, 1] //If you want to explicitly set the domain you can use this}
//         "is_categorical": true //This will be autodetected but you can set it explicitly if you need to
//         "manually_included" : false //This will be autodetected - covers whether a column is included by user in column description data
//         "colour_option": "Red (high) to green (low)"
//     }

// {
//     "metric_3": {
//         "long_name": "My metric 3",
//         "format": d3.format(",.1%"),
//         "domain": [0, 0.5, 1] //If you want to explicitly set the domain you can use this}
//         "is_categorical": true //This will be autodetected but you can set it explicitly if you need to
//         "manually_included" : false //This will be autodetected - covers whether a column is included by user in column description data
//         "colour_option": "Red (high) to green (low)"
//     }

var colours = ["#777", "#dc3912", "#ff9900", "#0E8917", "#990099", "#0099c6", "#dd4477", "#A6FF3C", "#FF3F42", "#1C3C5D", "#D860DA"];






function DataHolder(column_descriptions_data, colour_options, points) {

    this.all_points = points.slice();
    this.column_descriptions_data = column_descriptions_data;
    this.colour_options = colour_options;

    this.filter_points = function() {
        // Field to filter on
        var filter_field = d3.select("#filter_records_field").node().value;

        // Filter regex
        var filter_text = d3.select("#filter_records_text").node().value;

        this.points = _.filter(this.all_points, function(d) {
            if (filter_field == "none") {
                return true
            }

            var re = new RegExp(filter_text, "i")

            var match = re.test(d[filter_field])
            return match
        })

        var selected_month = d3.select("#filter_records_date_field").node().value;

        this.points = _.filter(this.points, function(d) {
            return d["month_text"] == selected_month
        })

    }

    // Idea will be to inc
    this.process_column_descriptions = function() {

        // Add any keys which are in the data but aren't in column_descriptions_data
        _.each(this.all_points[0], function(d, k) {
            if (!(_.has(this.column_descriptions_data, k))) {
                this.column_descriptions_data[k] = {
                    "manually_included": false
                }
            } else {
                this.column_descriptions_data[k]["manually_included"] = true
            }

        })

        // Add an entry for 'none', which will be used by select boxes etc for a null column selection
        this.column_descriptions_data["none"] = {
            "manually_included": false,
            "long_name": "None"
        }


        // If they don't have a long name, overwrite with the key
        _.each(this.column_descriptions_data, function(d, k) {
            if (!(_.has(d, "long_name"))) {
                d["long_name"] = k
            }
        });

        // Set default colour option to first in the list unless manually specified
        _.each(this.column_descriptions_data, function(d, k) {
            if (!(_.has(d, "colour_option"))) {
                d["colour_option"] = _.keys(this.colour_options)[0]
                d["colour_option_manually_set"] = false
            } else {
                d["colour_option_manually_set"] = true
            }
        })

        // Hold the key in the dict for easy access later
        _.each(this.column_descriptions_data, function(d, k) {
            d["key"] = k
        })


        // Detect whether variables are categorical or continuous
        // Iterate through the columns which will be part of this vis
        var all_points = this.all_points
        _.each(this.column_descriptions_data, function(d, k) {
            if (!(_.has(d, "is_categorical"))) {
                // Look through data - if we can parsefloat every value then we call it numeric otherwise categorical
                var categorical = _.some(all_points, function(d2) {
                    this_value = d2[k];

                    if (this_value !== "") {
                        var pf = parseFloat(this_value)

                        if (isNaN(pf)) {
                            return true
                        }
                    }
                    return false

                })
                this.column_descriptions_data[k]["is_categorical"] = categorical
            }
        });

        // Set format if not exists
        _.each(this.column_descriptions_data, function(d, k) {
            if (!(_.has(d, "format"))) {
                if (d["is_categorical"]) {
                    d["format"] = function(d) {
                        return d
                    }

                } else {
                    d["format"] = d3.format(",.1f")
                }
            }
        })


        // Detect whether domain has been set manually. 
        _.each(this.column_descriptions_data, function(d, k) {
            if (!(_.has(d, "domain"))) {
                d["domain_manually_set"] = false
            } else {
                d["domain_manually_set"] = true
            }
        });

    };


    this.numerical_to_float = function() {

        _.each(this.all_points, function(d) {
            _.each(this.column_descriptions_data, function(d2, k2) {
                if (!(d2["is_categorical"])) {
                    d[k2] = parseFloat(d[k2])
                }
            })
        })
    }



    //  Get rid of rows which don't have lat lng
    this.filter_out_invalid_coordinates = function() {
        this.all_points = _.filter(this.all_points, function(d) {
            if (isNaN(d["lat"])) {
                return false
            }
            if (isNaN(d["lng"])) {
                return false
            }
            return true
        })
    }

    this.set_domains = function() {
        var all_points = this.all_points
      

        _.each(this.column_descriptions_data, function(d1, k1) {

            // For each columns, set the domain

            // If categorical, get uniques

            if (d1["is_categorical"]) {

                var uniques = _.uniq(all_points, function(item, key) {
                    a = item[k1]
                    return item[k1]
                })

                uniques = _.map(uniques, function(d) {
                    return d[k1]
                })

                if (!(d1["domain_manually_set"])) {
                    d1["domain"] = uniques
                }
                d1["colour_scale"] = d3.scale.ordinal().domain(d1["domain"]).range(colours)
            }

            // If numeric, get min max

            if (!(d1["is_categorical"])) {

                var all_values = _.map(all_points, function(d) {
                    return d[k1]
                });

                var minMetric = Math.min.apply(null, all_values);
                var maxMetric = Math.max.apply(null, all_values);

                // Need to split min to max depending on how many items in colour scale

                // get colour scale 

                var c_options = this.colour_options[d1["colour_option"]]

                var num_colours = c_options.length
                var diff = maxMetric - minMetric

                domain = d3.range(minMetric, maxMetric + diff / 100, diff / (c_options.length - 1))

                if (!(d1["domain_manually_set"])) {
                    d1["domain"] = domain
                }

                d1["colour_scale"] = d3.scale.linear()
                    .domain(d1["domain"])
                    .range(c_options);

                d1["minmax"] = [minMetric, maxMetric]

            }


        })
    }

    this.update_colour_scales = function() {

        var colourScaleOption = d3.select("#colourOptions").node().value
        var colour_scale = this.colour_options[colourScaleOption]

        // Iterate through the column_descriptions_data updating the colour scale

        _.each(this.column_descriptions_data, function(d, k) {

            if (d["colour_option_manually_set"] == false) {

                if (!(d["is_categorical"])) {

                    var min_ = d["minmax"][0];
                    var max_ = d["minmax"][1];

                    var diff = max_ - min_;
                    var domain = d3.range(min_, max_ + diff / 100, diff / (colour_scale.length - 1));

                    if (!(d["domain_manually_set"])) {
                        d["domain"] = domain
                    }

                    d["colour_scale"] = d3.scale.linear().domain(d["domain"]).range(colour_scale)
                }
            }


        })

    }

    this.set_time_series = function(prison_name) {

        this.time_series = _.filter(this.all_points, function(d) {
            return d.moj_prison_name == prison_name
        })




        }

    this.extract_totals = function() {
        this.all_total_points = this.all_points.slice()
        this.all_total_points  = _.filter(this.all_total_points , function(d) {
            return d["moj_prison_name"] == "Total"
        })
    }

};

function TimeSeriesChart(holder, series_name, data) {

     // Need to get the x and y domains of the series
     var y_data = _.map(data, function(d) {return d[series_name]})
     var x_data = _.map(data, function(d) {return d["date"]})
     ymax = _.max(y_data, function(d) {return d})
     ymin = _.min(y_data, function(d) {return d})
     ymax = ymax * 1.05
     ymin = ymin*0.95

     xmax = _.max(x_data, function(d) {return d})
     xmin = _.min(x_data, function(d) {return d})


    var margin = {top: 40, right: 20, bottom: 40, left: 40},
    width = 350 - margin.left - margin.right,
    height = 130 - margin.top - margin.bottom;

    var formatDate = d3.time.format("%d-%b-%y");

    var x = d3.time.scale()
        .domain([xmin, xmax])
        .range([0, width])
        .nice();

    var y = d3.scale.linear()
        .domain([ymin, ymax])
        .range([height, 0])
        .nice();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5)

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5)
        .tickFormat(column_descriptions_data[series_name].format)

    var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d[series_name]); });

    var svg = holder.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
   

  svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)
      .attr("stroke", "steelblue")


    svg.append("text")
        .text(column_descriptions_data[series_name].long_name)
        .attr("y", -10)
        .attr("x", 50)
        .attr("class", "title")

    // Finally get the current selected month and plot a marker on the chart with the current data point



}