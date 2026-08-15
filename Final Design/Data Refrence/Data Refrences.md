# This data is used for application data references


# SKUs_DB
## Data Structure
|Column|Behaviour|
|------|---------|
|product_id|System generated|
|product_name|System generated|
|sku_number|System generated|
|product_weight|System generated|
|product_length|System generated|
|product_width|System generated|
|product_height|System generated|
|product_type|System generated|
|product_type_name|System generated|
|l0_category_name|System generated|
|l1_category_name|System generated|
|l2_category_name|System generated|
|storage_handling|System generated|
|product_company|System generated|
|brand_name|System generated|
|mslor|System generated|
|mslod|System generated|
|msltc|System generated|
|company|System generated|
|base_uom|System generated|
|product_unit_of_measurement|System generated|
|is_astro_sku|System generated|
|pcs_per_carton|System generated|
|food_or_non_food|System generated|
|fresh_or_frozen|System generated|


# Zone
## Data Structure
|Column|Behaviour|
|------|---------|
|Id|System generated| 
|Zone|System generated| 

# Checker_Lines
## Data Structure
|Column|Behaviour|
|------|---------|
|Id|System generated| 
|Line Name|System generated| 

# SO_DATA
this dataset is used to store Sales Order (SO) data, detailing the picker assigned and the items (SKUs) associated with each SO. It is used to populate the SO number dropdown, auto-fill picker name, and filter the searchable SKU dropdown when creating a pickup request.

## Data Structure
|Column|Behaviour|
|------|---------|
|Timestamp|System generated|
|picker_name|System generated|
|so_number|System generated|
|sku_number|System generated|
|product_name|System generated|
|status|System generated|
|SUM(request_quantity)|System generated|
|Wave|System Generated (New)|

# Stock Acitivty

this section is will be used as stock trailing data, if there any movement (Putaway, stock deduction, stock movement) it will be recorded in this section

## Data Structure
|Column|Behaviour|
|------|---------|
|Activity ID|System generated| 
|Ticket ID|Depends on wich process|
|Sku Code|Depends on wich process|
|Product Name|Depends on wich process|
|Qty|Depends on wich process|
|Operator|depends on the ticket ID refrence if its increased use + , if its decreased use -|
|From Location|Depends on wich process|
|To Location|Depends on wich process|

### Data Behavior

1. Data source is from process Putaway

|Column|Behaviour|
|------|---------|
|Activity ID|System generated|
|Ticket ID|Putaway[Ticket ID]|
|Sku Code|Putaway[Sku Code]|
|Product Name|Putaway[Product Name]|
|Qty|Putaway[Qty Put]|
|Operator|+| 
|From Location|if Ticket ID starts with C Use Checker_Lines[Line Name], if Ticket ID starts with L use Lost_and_Found[Found At]|
|To Location|Putaway[Location]|


2. Data source is from process Stock_Deduction

will be detailed later

3. Data Source if rom Stock_Movement

will be detailed later

# SOH
this dataset is to store stock on hand that is used for IRMS process, it will be updated from time to time when theres activity that affect the stock (Putaway, stock deduction, stock movement)

## Data Structure
|Column|Behaviour|
|------|---------|
|Updated At|System generated|
|Product ID|lookup from SKUs_DB based on SKU Code|
|Product Name|lookup from SKUs_DB based on SKU Code|
|Sku Number|lookup from SKUs_DB based on SKU Code|
|L0 Category Name|lookup from SKUs_DB based on SKU Code|
|L1 Category Name|lookup from SKUs_DB based on SKU Code|
|L2 Category Name|lookup from SKUs_DB based on SKU Code|
|Food or Non Food|lookup from SKUs_DB based on SKU Code|
|Rack Location|System generated|
|Qty SOH|System generated|
|Qty On SO|System generated|
|Count SO|System generated|
|Qty On LDP|System generated|
|Stock Age|System generated|
|Action Suggestion|System generated LDP RECOVERY/WH ADJUST IN|


# User_DB 
this dataset is used to store user data that is used for IRMS process, it will be updated from time to time when theres activity that affect the stock (Putaway, stock deduction, stock movement)

## Data Structure
|Column|Behaviour|
|------|---------|
|Staff ID|System generated|
|Name|System generated|
|Role|System generated|
|Acess|population from all available menu, can multiple, unlock all if role = Super|
|Password|System generated suggested 4 digit number|

# Racks
|Column|Behaviour|
|------|---------|
|Location Name|System generated|
|Facillity|System generated|
|Zone|lookup from Zone|
|Aisle|System generated|
|Bay|System generated|
|Partisi|System generated|
|Level|System generated|
|Priority|System generated|
|Capacity|System generated|
|Environment|System generated|


# SOHWH

## Data Structure
|Column|Behaviour|
|------|---------|
|product_id|System generated|
|sku_number|System generated|
|product_name|System generated|
|rack_name|System generated|
|Qty Stock|System generated|
|Reserve Stock|System generated|
|Final Virtual SOH|System generated|

# WH_PLANOGRAM

## Data Structure
|Column|Behaviour|
|------|---------|
|L1 Category|System generated|
|Zone Suggestion|System generated|
|Aisle Suggestion|System generated|

Example:
| Minuman | SRA1 | 01 - 08 |
| Snack | SRA1 | 09 - 10 |
| Makanan Beku | SFRA1 | 01 - 02 |