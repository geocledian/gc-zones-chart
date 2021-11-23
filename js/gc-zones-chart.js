/*
 Vue.js Geocledian zones-chart component
 created: 2019-11-04, jsommer
 last update: 2020-06-22, Tarun
 version: 0.9.1
*/
"use strict";

//language strings
const gcZoneschartLocales = {
  "en": {
    "options": { "title": "Zones chart" },
    "description": { 
      "id": "ID",
      "parcel": "Parcel",
      "sdate": "Sensing date"
    },
    "legend" : { 
      "uncultivated_area" : "uncultivated area",
      "area_under_crops" : "area under crops",
      "fraction_under_crops" : "fraction under crops",
    }
  },
  "de": {
    "options": { "title": "Zonen Graph" },
    "description": { 
      "id": "Nr",
      "parcel": "Feld",
      "sdate": "Aufnahmedatum"
    },
    "legend" : { 
      "uncultivated_area" : "unbewirtschaftete Fläche",
      "area_under_crops" : "bewirtschaftete Fläche",
      "fraction_under_crops" : "Anteil bewirtschafteter Fläche",
    }
  },
}

Vue.component('gc-zones-chart', {
  props: {
    gcWidgetId: {
      type: String,
      default: 'zones-chart1',
      required: true
    },
    gcZonesData: {
      type: Object,
      default: {}
    },
    gcMode: {
      type: String,
      default: "pie" // "pie" or "donut"
    },
    gcAvailableOptions: {
      type: String,
      default: "title,legend" // available options
    },
    gcWidgetCollapsed: {
      type: Boolean,
      default: true // or true
    },
    gcLanguage: {
      type: String,
      default: 'en' // 'en' | 'de'
    },
    gcLegendPosition: {
      type: String,
      default: 'bottom' // 'bottom', 'right' or 'inset'
    },
    gcWhiteLabel: {
      type: Boolean,
      default: false // true or false
    }
  },
  template: `<div :id="gcWidgetId" class="gc-zones-chart">       

              <p class="gc-options-title is-size-6 is-orange" style="cursor: pointer;" 
                v-on:click="toggleZoneschart"   
                v-show="this.availableOptions.includes('title')">
                {{ $t('options.title') }}
                <i :class="[gcWidgetCollapsed ? '': 'is-active', 'fas', 'fa-angle-down', 'fa-sm']"></i>
              </p>
              <div :class="[gcWidgetCollapsed ? '': 'is-hidden']">
               <div class="is-flex">
                <div class="is-grey" v-show="this.availableOptions.includes('description')">
                </div>

                </div>
                <!-- watermark -->
                <div :class="[this.gcWhiteLabel ? 'is-hidden': 'is-inline-block', 'is-pulled-right']"
                  style="opacity: 0.65;">
                  <span style="vertical-align: top; font-size: 0.7rem;">powered by</span><br>
                  <img src="img/logo.png" alt="geo|cledian" style="width: 100px; margin: -10px 0;">
                </div>
               </div>

                <div :id="'chartNotice_'+gcWidgetId" class="content is-hidden"></div>

                <div :id="'chartSpinner_'+gcWidgetId" class="chartSpinner zones-chart-spinner is-hidden"  style="max-height: 50px!important;">
                  <div class="rect1"></div>
                  <div class="rect2"></div>
                  <div class="rect3"></div>
                  <div class="rect4"></div>
                  <div class="rect5"></div>
                </div>

                <div style="position: relative; padding-top: 4em;">
                  <div :id="'chart_'+gcWidgetId" :class="['gc-zones-chart-chart-'+this.gcMode]">
                  </div>
                  <div :id="'chartlegend_'+gcWidgetId"></div>
                </div>
              </div>
          </div>
          <!-- chart -->`,
  data: function () {
    return {
      chart: undefined,
    }
  },
  computed: {
    // chartWidth: function() {
    //     console.debug("clientwidth "+document.getElementById(this.gcWidgetId).clientWidth);
    //     console.debug("offsetwidth "+document.getElementById(this.gcWidgetId).offsetWidth);
    //     return parseInt(document.getElementById(this.gcWidgetId).offsetWidth);
    // },
    // chartHeight: function() {
    //     console.debug("clientheight "+document.getElementById(this.gcWidgetId).clientHeight);
    //     console.debug("offsetheight "+document.getElementById(this.gcWidgetId).offsetHeight);
    //     //return parseInt(document.getElementById(this.gcWidgetId).offsetHeight);
    //     return parseInt(document.getElementById(this.gcWidgetId).style.height);
    // },
    availableOptions: {
      get: function() {
        return (this.gcAvailableOptions.split(","));
      }
    },
    currentLanguage: {
      get: function() {
        // will always reflect prop's value 
        return this.gcLanguage;
      },
    },
  },
  i18n: { 
    locale: this.currentLanguage,
    messages: gcZoneschartLocales
  },
  created: function () {
    console.debug("zones-chart! - created()");
    try {
      this.changeLanguage();
    }
    catch (ex) 
    {
      console.error(ex);
    }
  },
  /* when vue component is mounted (ready) on DOM node */
  mounted: function () {

    //handle chart resizing
    //window.addEventListener('resize', this.triggerResize);

    //console.log(this);
    //document.getElementById("chart_" + this.gcWidgetId).classList.add("is-hidden");
    //document.getElementById("chartSpinner_" + this.gcWidgetId).classList.remove("is-hidden");

    // listen on size change handler
    this.$root.$on("containerSizeChange", this.containerSizeChange);

    /* init chart */
    this.chart = bb.generate({
      bindto: '#chart_'+this.gcWidgetId,
      // fixHeightResizing: true,
      // size: {
      //   width: this.chartWidth, 
      //   height: this.chartHeight
      // },
      data: {
        columns: [],
        type: this.gcMode, // 'gauge','pie' or 'donut'
      },
      legend: {
        // hide: !this.availableOptions.includes('legend') ? ["area under crops", "uncultivated area", "fraction under crops"] : [],
        position: this.gcLegendPosition,
      }
    });

    //initial loading data
    if (this.gcParcelId > 0) {
      this.currentParcelID = this.gcParcelId;
      this.handleCurrentParcelIDchange();
    }
  },
  watch: {
    gcZonesData (newValue, oldValue) {
      this.createChartData();
    },
    currentLanguage(newValue, oldValue) {
      this.changeLanguage();
      //rebuild chart if language changed, otherwise localization will not refresh
      this.createChartData();
    },
    gcMode(newValue, oldValue) {
      // gauge shall always have bottom position for legend
      if (newValue === "gauge") {
        this.gcLegendPosition = "bottom";
      }
      this.createChartData();
    },
    gcLegendPosition(newValue, oldValue) {
      // gauge shall always have bottom position for legend
      if (newValue === "inset" && this.gcMode === "gauge") {
        this.gcLegendPosition = "bottom";
      }
      this.createChartData();
    },
  },
  methods: {
    toggleZoneschart: function () {
      this.gcWidgetCollapsed = !this.gcWidgetCollapsed;
    },
    createChartData: function() {

      console.debug("createChartData()");
  
      let columns = [];

      
      if (this.gcZonesData) {
        if (this.gcMode == "pie" || this.gcMode == "donut") {
          // format values to 2 decimals
          try { columns[0] = ["zone_1"].concat(this.formatDecimal(this.gcZonesData.zone_1.area, 2)); } catch (ex) {}
          try { columns[1] = ["zone_2"].concat(this.formatDecimal(this.gcZonesData.zone_2.area, 2)); } catch (ex) {}
          try { columns[2] = ["zone_3"].concat(this.formatDecimal(this.gcZonesData.zone_3.area, 2)); } catch (ex) {}
          try { columns[3] = ["zone_4"].concat(this.formatDecimal(this.gcZonesData.zone_4.area, 2)); } catch (ex) {}
          try { columns[4] = ["zone_5"].concat(this.formatDecimal(this.gcZonesData.zone_5.area, 2)); } catch (ex) {}
        }

        document.getElementById("chartSpinner_" + this.gcWidgetId).classList.add("is-hidden");
        document.getElementById("chart_" + this.gcWidgetId).classList.remove("is-hidden");
        document.getElementById("chartNotice_"+this.gcWidgetId).classList.add("is-hidden");

        this.createChart(columns);
      }
      

    },
    createChart: function(data) {

      let color_options = {};
      let pie_options = {};
      let pie_color_options = {};

      if (this.gcMode == "pie" || this.gcMode == "donut") {
        pie_options = {
          label: {
              format: function (value, ratio, id) {
                  return this.formatDecimal(value, 1) + " ha";
              }.bind(this)
          },
          expand: true,
          //innerRadius: 20
        };
        pie_color_options = {
          "zone_1": '#d7191c', //'#ba1414', (darker)
          "zone_2": '#fdae61', //'#e6865a', (darker)
          "zone_3": '#ffffc0', //'#ffffbf', (darker)
          "zone_4": '#a6d96a', //'#b9db85', (darker)
          "zone_5": '#1a9641'  //'#379223', (darker)
        };
      }
  
      this.chart = bb.generate({
        bindto: '#chart_'+this.gcWidgetId,
        // size: {
        //   width: this.chartWidth,  
        //   height: this.chartHeight
        // },
        data: {
          columns: [],
          type: this.gcMode, 
          colors: pie_color_options,
          order: null, // loading order; "desc" or "asc" order by value is also available
          names: {
            "zone_1": "zone 1 (> 25% below mean)",
            "zone_2": "zone 2 (5% to 25% below mean)",
            "zone_3": "zone 3 (-5% / +5% mean)",
            "zone_4": "zone 4 (5% to 25% above mean)",
            "zone_5": "zone 5 (> 25% above mean)"
          },
          labels: {
            colors: {
              "zone_1": "#eee",
              "zone_2": "#4a4a4a",
              "zone_3": "#4a4a4a",
              "zone_4": "#4a4a4a",
              "zone_5": "#eee"
            }
          }
        },
        pie: pie_options,
        color: color_options,
        transition: {
            duration: 500
        },
        legend: {
          //hide: !this.availableOptions.includes('legend') ? ["area under crops", "uncultivated area", "fraction under crops"] : [],
          position: this.gcLegendPosition,
          // contents: {
          //   bindto: "#chartlegend_"+this.gcWidgetId,
          //   template: "<span style='color:#fff;padding:10px;background-color:{=COLOR}'>{=TITLE}</span>"
          // }
        }
      });

      // toggles animation of chart
      this.chart.load({
        columns: data, 
        done: function() {
          setTimeout( function() {
            this.chart.resize();
          }.bind(this), 100);
        }.bind(this)
      });
    },
    containerSizeChange(size) {
      /* handles the resize of the map if parent container size changes */
      console.debug("containerSizeChange - gc-zones-chart");
      this.chart.resize();
    },
    /* GUI helper */
    changeLanguage() {
      this.$i18n.locale = this.currentLanguage;
    },  
    /* helper functions */
    removeFromArray: function(arry, value) {
      let index = arry.indexOf(value);
      if (index > -1) {
          arry.splice(index, 1);
      }
      return arry;
    },
    formatDecimal: function(decimal, numberOfDecimals) {
      /* Helper function for formatting numbers to given number of decimals */
  
      var factor = 100;
  
      if ( isNaN(parseFloat(decimal)) ) {
          return NaN;
      }
      if (numberOfDecimals == 1) {
          factor = 10;
      }
      if (numberOfDecimals == 2) {
          factor = 100;
      }
      if (numberOfDecimals == 3) {
          factor = 1000;
      }
      if (numberOfDecimals == 4) {
          factor = 10000;
      }
      if (numberOfDecimals == 5) {
          factor = 100000;
      }
      return Math.ceil(decimal * factor)/factor;
    },
    capitalize: function (s) {
      if (typeof s !== 'string') return ''
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    isDateValid: function (date_str) {
      /* Validates a given date string */
      if (!isNaN(new Date(date_str))) {
          return true;
      }
      else {
          return false;
      }
    },
    loadJSscript: function (url, callback) {
      
      let script = document.createElement("script");  // create a script DOM node
      script.src = gcGetBaseURL() + "/" + url;  // set its src to the provided URL
      script.async = true;
      console.debug(script.src);
      document.body.appendChild(script);  // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
      script.onload = function () {
        callback();
      };
    },

    showMsg : function (msg) {
      try { document.getElementById("sDate_"+this.gcWidgetId).classList.add("is-hidden"); } catch (ex) {}
      try { document.getElementById("desc_" + this.gcWidgetId).classList.add("is-hidden"); } catch (ex) {}

      if(msg === 'key is not authorized'){
        document.getElementById("chartNotice_" + this.gcWidgetId).innerHTML = "Sorry, the given API key is not authorized!<br> Please contact <a href='https://www.geocledian.com'>geo|cledian</a> for a valid API key.";
      }
      else if(msg === 'api key validity expired'){
        document.getElementById("chartNotice_" + this.gcWidgetId).innerHTML = "Sorry, the given API key's validity expired!<br> Please contact <a href='https://www.geocledian.com'>geo|cledian</a>for a valid API key.";
      } else{
        document.getElementById("chartNotice_" + this.gcWidgetId).innerHTML = "Sorry, an error occurred!<br>Please check the console log for more information.";
      }

      document.getElementById("chartNotice_" + this.gcWidgetId).classList.remove("is-hidden");
      document.getElementById("chartSpinner_" + this.gcWidgetId).classList.add("is-hidden");
    },

   hideMsg : function (msg) {
      try { document.getElementById("sDate_"+this.gcWidgetId).classList.remove("is-hidden"); } catch (ex) {}
      try { document.getElementById("desc_" + this.gcWidgetId).classList.remove("is-hidden"); } catch (ex) {}
      document.getElementById("chartNotice_"+this.gcWidgetId).classList.add("is-hidden");
      document.getElementById("chart_" + this.gcWidgetId).classList.add("is-hidden");
      document.getElementById("chartSpinner_" + this.gcWidgetId).classList.remove("is-hidden");
    }
  }
});