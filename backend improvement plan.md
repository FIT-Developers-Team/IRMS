# SOHWH

Current Write Limitations: There are currently no write, update, or delete endpoints for SOHWH in the Google Apps Script backend (Code.gs).

Improvement:

Currently i use google sheet as bridge data from superset that runs on clickhouse, im using appscript API to fetch the data , this make some latency time for the SOHWH page load, to avoid this we need to connect Superset directly uses session cookie authentication

the cookie is stored on google sheet:
https://docs.google.com/spreadsheets/d/1Clj9YvTa6zaFnuEZI0eSDFAIGSBIl7vjqaYcWLNIGtg/edit?gid=0#gid=0

Tab name : Cookie 
Value Cookie location : A1

heres some sample payload that im currently working on at google sheet trough Appscript 

function DataSOHWH(filterValue = null, rowLimit = 100000, resultFormat = "csv") {
  return {
    datasource:    { id: 348, type: "table" },
    force:         true,
    result_format: resultFormat,
    result_type:   "results",
    queries: [
      {
        columns: [
          "product_id",
          "sku_number",
          "product_name",
          "rack_name"
        ]
      ,
        metrics: [
          {
            expressionType: "SIMPLE",
            aggregate:      "SUM",
            column:         { column_name: "stock" },
            label:          "Qty Stock",
          },
        ],

        filters: [
          {
            col: "product_detail_created_at",
            op:  "TEMPORAL_RANGE",
            val: "No filter",
          },
          {
            col: "location_id",
            op:  "IN",
            val: ["819"]
          },
          {
            col: "stock",
            op:  ">",
            val: "0"
          },
          {
            col: "inventory_status",
            op:  "IN",
            val: ["available"]
          }
        ],
        row_limit: rowLimit,
      },
    ],
  };
}


Requierment improvemenet:

First we need fetch the cookie provided above from google sheet uses csv endpoint for faster latency, then store the cookie on the client cache

we need to rely on client side for data sync, so no data is stored on server

we need also to implement cache management specificly for SOHWH

goals: on the interface spesificly on SOH the data directly wired up on superset endpoint uses session login, so the data should be fresh every time user hit refresh

we need to makesure the refresh button doesnt overlaping or interrupt the others function, becuse this will involve 2 diffrent source of data

also for faster fetching, we use csv endpoint on from superset, do not use json

we also had to make sure the new backend logic is properly wired up on front end interface


