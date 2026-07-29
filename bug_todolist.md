# BUGS and to do list CBT IRMS 29/07/2026


# BUGS:

# Picking Task BUG
1. remove bulkAssignBtn picking button on desktop view (redundant) keep the button that has slide to start (mobileStartPickBtn)
2. on task view on sub tab waiting list add select all function on mobile view
3. on desktop view when selecting each individual data, the start picking doesn't show up
4. on picking tasks , all task sub tab doesn't show all data, only show completed tasks


# SOH
on when pushing data to SOH , the data is writed at be bottom of row, it seems the backend scans all rows that has value, some cell are using array formula




# Improvement:

## UI/UX
freeze bottom navigation on mobile view
when navigating to different page, use the web launching animation to wait the data loading, instead of do nothing on interface
fix dropdown rack location at putaway, use custom dropdown
fix number count on checker request, there are number even tough the user does not have any data




## Backend
when refreshing, also refresh the cached data, so the old data on local storage is reflecting as backend data
if role admin/spv/manager/super then show all data for each tab not limited to private condition rule
add drop down reason for stock deduction for findings discrepancy




# Feature changes and upgrade

stock transfer reason damage is should be deduction stock
on stock deduction , to location 
when ldp recovery the sloc target will be decited on assigned picker