# Request Pickup
this section is used to request pickup excess item from process
this section will be used mainly on web

# Fields
This field will be input by staff


|Column Name|Behaviour|
|--------------|---------|
|Ticket ID     |System generated RC + 6 digit uniqueid|
|Checker Line  |dropdown from checker_lines table|
|timestamp     |system generated|
|picker name   |lookup from so number|
|checker name  |Lookup from user login credential|
|so number     |drop down from so realtime status = picking, packing, staging|
|product detail|dropdown, the dropdown value is from sku_number+product_name the sku number can be searched, the drop down value is nested line Top =sku_number bottom small = product_name|


|qty           |user input |
|status        |system generated (Pending)| 