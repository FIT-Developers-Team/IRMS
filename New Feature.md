# New Feature Implemenation

## Troubleshoot

This feature is completly independent of old features, this feature uses existing table from SOH, SOHWH and SO_DATA as data refrence.

this feature will be used for checker process and picking process, this feature is used for creating request ticket for troubleshooters , and the admin will assign the ticket to trouble shooters , and the troubleshooter will pick and process the ticket, and they will search the requested item on `origin_rack_name` from SO_DATA first, they need to validate as they are already go to the origin rack by scanning the rack for validating, if its not found at `origin_rack_name`, the system will suggest to look at `SOH.Rack Location` it only scans rack location that has word STG as the suggestion, if the item still not found at `SOH.Rack Location`, system will suggest to look to `SOHWH`
after found the item, the troubleshooter will update the ticket , and the system will update the ticket data

Table Name: Trouble_shoot

|Column Name    | Description |
|-------------- |-------------|
id              | data key (TS - RC xxx for checker TS - PC xxx for picker)
Request Timestamp| first data entry timestamp
Requested By    | requester name
Staff ID        | staff ID
Checker Line    | Checker line ( Hide if the user role is picker)
Photo           | Image input ( required if user role is picker, optional if checker)
Reason          | the reason for the request (required: Bad Item / Wrong Picking/ Missing item)
picker_name     | Picker name  (SO_DATA)
so_number       | SO Number (SO_DATA)
sku_number      | SKU Number (SO_DATA)
product_name    | product name (SO_DATA)
origin_rack_name| origin rack name (SO_DATA)
request_quantity| request quantity (SO_DATA)
Assigned By     | Admin / Spv name who doing the assignment
Assigned To     | Picker name who accept the ticket
Status Ticket   | Open/Assigned/Picked up/Found/Found Partial/Not Found
Troublesoot Evidance| image input
Found Qty       | Found Quantity
Found_at        | the rack name of the found item
Delivered_at    | the timestamp of the item is delivered
Picked By       | staff id who pickup the ticket
Update At       | last updated timestamp

# Work Logic

1. Checker/picker Request ticket for troubleshooter
2. Admin will assign the ticket to trouble shooter
3. Trouble shooter pick the ticket and update Status Ticket & Update At
4. Trouble shooter go to `origin_rack_name` from SO_DATA first, they need to validate as they are already go to the origin rack by scanning the rack for validating
5. if its not found at `origin_rack_name`, the system will suggest to look at `SOH.Rack Location` it only scans rack location that has word STG as the suggestion
6. if its not found at `SOH.Rack Location`, system will suggest to look at `SOHWH.rack_name`
7. if found the item, update `Found_at` & `Found Qty` & `Update At` & `Status Ticket` to Found and troubleshooter will fill the delivered at, its freetext and allow scanner input
8. if found item from `SOH.Rack Location` then trigger `SOH_DATA` to deduct stock, and add record on Stock_Activity
9. if found item from `SOHWH.rack_name` then no need to trigger any deduction on SOH
10. if none of the above found, update `Status Ticket` to Not Found and troubleshooter will fill the delivered at, its freetext and allow scanner input


# UI
- it will create new menu for "TS Request" as for creating new ticket (visible for checker,picker)

- it will create new menu "Troubleshoot" as for main view for viewing all ticket request and do the assignment (only visible for admin and spv)

- it will create "TS Task" menu as for main view for viewing all the assigned ticket request and do the picking (only visible for picker)

