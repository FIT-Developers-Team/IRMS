# Stock Movement
this section is for stock movement that cover all type of stock movement
- Transfer location (moving from one location to another)
- Stock deduction (deduct stock from location (recovery to warehouse)

|Column Name | Behaviour|
|------------|----------|
|Movement ID|SM + 6 digit uniqueid| 
|Timestamp|System Generated| 
|Assigned By|Lookup from user login credential|
|Staff Name|Dropdwon from User_DB|
|Sku Code|Follows Selected SOH ROW Data|
|Product Name|Follows Selected SOH ROW Data|
|source Qty|Follows Selected SOH ROW Data|
|Qty|Assigned staff input|
|Type|dropdwon (Transfer location / Stock deduction)| 
|Reason|Dropdown , IF Stock Deduction: Recovery LDP, Recovery SO,WH Adjust IN, IF Transfer Location: Bad/Damaged/Expired, Buffer SO, Other (explain)|
|From Location|Follows Selected SOH ROW Data|
|To Location|Assigned staff input| 
|Status|System Generated (Pending)| if done this section will reference to Stock Acitivity | 


this section is binded to SOH , this section is acting like sub data for SOH

this section involve admin/supervisior and staff, admin/supervisior will be assing the staff for the activity

for assignment process the the assigner requiered to fill type and reason

at SOH theres will be a button for assign the activity movement activity , the button placement on soh pop up detail stock modal

user will press the button for assign the staff Populate from User_DB (Staff Name) 

when status is still pending, at the movement table there will be a edit button to change the assigned staff and re assigning, and the stock is not affected yet, and so the stock activity is empty

when status is done, at the movement table there will be no edit button and the stock will be affected based on the type and reason, and so the stock activity will be populated with the stock movement activity