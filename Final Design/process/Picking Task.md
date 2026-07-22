# Picking Task
This section is used for picking that handle request task from request checker


|Column|Behaviour|
|------|---------|
|Picking ID|system generated|
|Ticket ID|lookup from request checker|
|Picked By|lookup from user login credential|
|Sku Code|lookup from request checker|
|Product Name|lookup from request checker|
|Qty|lookup from request checker|
|Status|system generated (Picking , Completed, Cancelled)|

Design:

This section is mainly will be used on mobile devices, for creating picking task, when user click a + button, theres a popup modal that populate data from request checker for the Status is Pending only, the popup modal have select box, user can select all, for finalize task creating user swipe right to proceed, and populate the data to table Picking Task, and update status to Picking for selected data on Request_Checker, when user already swipe right theres a success popup and redirect to Picking Task page

