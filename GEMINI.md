Patch admin dashboard numbers
In src/app/admin/dashboard/page.tsx, find the setStats({...}) call inside fetchData
and replace it using the patch in admin-dashboard-patch.txt.
The change removes K/M abbreviations from:

totalInvested
platformBalance
totalPaidOut
avgSeasonROI (now shows sign e.g. +23.40%)
payoutRate (now shows 2 decimal places)


