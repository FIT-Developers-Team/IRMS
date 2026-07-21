# Lost And Found
This section has the same concept as Request Checker; its purpose is to create a new entry that will become a picking task later, but the data has slight differences. 

|Column Name | Behaviour|
|------------|----------|
|Ticket ID|LF + 6 digit uniqueid|
|Timestamp|System Generated|
|BTI Staff|Lookup from user login credential|
|Sku Code|User Input|
|Qty|User Input|
|Found At|Free text input (must contain selected Zone), hidden if Reason is Unknown Location| 
|Status|System Generated (Pending)|
|Reason|Dropdown Sloc Mismatch / Damaged Item / Unknown Location / Excess Item|