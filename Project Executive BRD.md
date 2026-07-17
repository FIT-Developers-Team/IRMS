# Inventory Recovery Management System (IRMS)

Project definition:
IRMS is a web-based system that will help businesses manage their inventory and recovery processes. It will be used to track and accommodate inventory excess for each operational process.

## IRMS process definition
[Request Pickup]
[Inbound] (Can be implemented onv2)
[Inventory] (Can be implemented onV2)


[Outbound]

Parameter to be covered
    3.1 Reff ID (user input)
    3.2 SKU CODE (user input dropw down based on so number)
    3.3 Product Name (system) join on so data
    3.4 Qty excess (user input)
    3.5 Checker Name (System)
    3.6 Picker Name ( System join on so data)
    3.7 Staff ID (System)
    4.8 SO Number(User input)






[Register] / Inbound / GRN
this is the first step for data entry in IRMS , in this process, it will cover :
    1. Inbound warehouse process (Can be used for excess item from vendor)
    Parameter to be covered
    1.1 Vendor Name
    1.2 PO Number (user input / Optional) 
    1.3 SKU CODE
    1.4 Product Name (System)
    1.5 Staf handover
    1.6 Qty
    1.7 Reason (Drop down)
    1.8 To sloc
    


    2. Inventory warehouse process
    2.1 zone/area inventory name
    2.2 stock location (drop down based on zone/area and optional)
    2.3 SKU CODE
    2.4 Product Name
    2.5 Staff handover
    2.6 Qty
    2.7 Reason (Drop dwon)
    2.8 To sloc


    3. Outbound process
    3.2 SKU CODE (user input dropw down based on so number)
    3.3 Product Name (system) join on so data
    3.4 Qty excess (user input)
    3.5 Checker Name (System)
    3.6 Picker Name ( System join on so data)
    3.7 Staff ID (System)
    4.8 SO Number(User input)
    4.9 To sloc
    4.10 Reff ID


this section is used for making data entry for each warehouse process that will create an inventory excess, will have process related data.

[Keep] / Stock
this is the core function of IRMS that manage the all excess item data, this proecss will have:

- SKU Aging
- Qty Of Excess
- Source Ratio (to see ration the sku source from what process)
- Occpuancy Storage IRMS
- Data lookup ( to match SOH IRMS to LPD,So today / TS)
- Location (to see where the excess located in the warehouse )

[Stock Movement]
this section is used for moving the stock data in the IRMS Scope

Parameter to be covered
- Source location (user input)
- Sku Code (user input)
- Product Name (sysem)
- Qty (user input)
- Staff id (system)
- Time stamp (System)
- To location ( user input)





[Staging] / Replenishment 
a pick face process for staging data and item if the SOH IRMS matches SO today


[Takeout] / Outbound
this proecss will conver the transaction out data activity



